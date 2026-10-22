"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@/components/Alert";
import DataTable from "@/components/DataTable";
import FormField from "@/components/FormField";
import { useAction } from "@/hooks/useAction";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import type { Attendance, AttendanceStatus, Course, Enrollment, Student } from "@/lib/types";
import { fullName, today } from "@/lib/utils";

const STATUSES: AttendanceStatus[] = ["Present", "Absent", "Late"];

const emptyFilters = { search: "", studentId: "", courseId: "", date: "", status: "" };

export default function AttendancePage() {
  const records = useFetch<Attendance>("/attendance");
  const enrollments = useFetch<Enrollment>("/enrollments");
  const students = useFetch<Student>("/students");
  const courses = useFetch<Course>("/courses");

  const loading =
    records.loading || enrollments.loading || students.loading || courses.loading;
  const loadError =
    records.error || enrollments.error || students.error || courses.error;

  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const { run, busy } = useAction(setActionError);

  // ---- Record attendance form (course -> students -> mark -> save all) ----
  const [showForm, setShowForm] = useState(false);
  const [formCourseId, setFormCourseId] = useState("");
  // Left empty on first render; today's date is set when the form opens
  // (an event handler), because new Date() can't run during prerender.
  const [date, setDate] = useState("");
  // Only students whose status was changed are stored; everyone else is "Present".
  const [marks, setMarks] = useState<Record<number, AttendanceStatus>>({});

  const [filters, setFilters] = useState(emptyFilters);
  // Text shown in the combined student search / dropdown box.
  const [studentText, setStudentText] = useState("");

  // Attendance percentage for the student selected in the filter.
  // Re-fetches when records change (e.g. after recording new attendance).
  const [percentage, setPercentage] = useState<number | null>(null);
  const [percentageLoading, setPercentageLoading] = useState(false);
  const [percentageError, setPercentageError] = useState("");

  useEffect(() => {
    if (!filters.studentId) {
      setPercentage(null);
      setPercentageError("");
      setPercentageLoading(false);
      return;
    }

    let cancelled = false;
    setPercentageLoading(true);

    api
      .get<{ studentId: number; attendancePercentage: number }>(
        `/attendance/student/${filters.studentId}/percentage`
      )
      .then((res) => {
        if (cancelled) return;
        setPercentage(res.attendancePercentage);
        setPercentageError("");
      })
      .catch(() => {
        if (cancelled) return;
        setPercentage(null);
        setPercentageError("Unable to load attendance percentage.");
      })
      .finally(() => {
        if (!cancelled) setPercentageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.studentId, records.data]);

  const percentageLevel =
    percentage === null
      ? ""
      : percentage >= 85
      ? "good"
      : percentage >= 75
      ? "warn"
      : "low";

  const percentageValue = !filters.studentId
    ? "Select a student"
    : percentageError
    ? "—"
    : percentageLoading || percentage === null
    ? "Loading..."
    : `${percentage.toFixed(1)}%`;

  // Look up an enrollment by id once, instead of searching the array per row.
  const enrollmentById = useMemo(
    () => new Map(enrollments.data.map((e) => [e.id, e])),
    [enrollments.data]
  );

  // Attach the enrollment (student + course) to every record, once.
  const rows = useMemo(
    () =>
      records.data.map((r) => ({
        ...r,
        enrollment:
          r.enrollment ??
          (r.enrollmentId !== undefined
            ? enrollmentById.get(r.enrollmentId)
            : undefined),
      })),
    [records.data, enrollmentById]
  );

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        const e = r.enrollment;
        const sid = e?.student?.id ?? e?.studentId;
        const cid = e?.course?.id ?? e?.courseId;
        const q = filters.search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          String(fullName(e?.student)).toLowerCase().includes(q) ||
          String(e?.student?.studentNo ?? "").toLowerCase().includes(q);
        return (
          matchesSearch &&
          (!filters.studentId || String(sid) === filters.studentId) &&
          (!filters.courseId || String(cid) === filters.courseId) &&
          (!filters.date || r.attendanceDate === filters.date) &&
          (!filters.status || r.status === filters.status)
        );
      }),
    [rows, filters]
  );

  const countStatus = (s: AttendanceStatus) =>
    visible.filter((r) => r.status === s).length;

  // ---- Record form data ----

  // Students enrolled in the course chosen in the form, ordered by student number.
  const courseEnrollments = useMemo(
    () =>
      formCourseId
        ? enrollments.data
            .filter((en) => String(en.course?.id ?? en.courseId) === formCourseId)
            .slice()
            .sort((a, b) =>
              String(a.student?.studentNo ?? "").localeCompare(
                String(b.student?.studentNo ?? "")
              )
            )
        : [],
    [enrollments.data, formCourseId]
  );

  // Enrollments that already have attendance on the chosen date (id -> status).
  const recordedStatus = useMemo(() => {
    const map = new Map<number, AttendanceStatus>();
    if (!date) return map;
    records.data.forEach((r) => {
      const id = r.enrollmentId ?? r.enrollment?.id;
      if (id !== undefined && r.attendanceDate === date) map.set(id, r.status);
    });
    return map;
  }, [records.data, date]);

  // Students still waiting to be marked for this course + date.
  const pending = useMemo(
    () => courseEnrollments.filter((en) => !recordedStatus.has(en.id)),
    [courseEnrollments, recordedStatus]
  );

  const statusOf = (id: number): AttendanceStatus => marks[id] ?? "Present";
  const pendingCount = (s: AttendanceStatus) =>
    pending.filter((en) => statusOf(en.id) === s).length;

  function setAll(s: AttendanceStatus) {
    setMarks(Object.fromEntries(pending.map((en) => [en.id, s])));
  }

  function setFilter(key: keyof typeof emptyFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const studentLabel = (s: Student) => `${s.studentNo} — ${fullName(s)}`;

  // One box for both searching and picking a student:
  // - typing filters the suggestion list and the table (by name / number)
  // - choosing a suggestion selects that student (enables the attendance %)
  function handleStudentInput(value: string) {
    setStudentText(value);
    const match = students.data.find((s) => studentLabel(s) === value);
    setFilters((prev) => ({
      ...prev,
      studentId: match ? String(match.id) : "",
      search: match ? "" : value,
    }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setStudentText("");
  }

  function toggleForm() {
    setActionError("");
    setSuccess("");
    if (!showForm) {
      setDate(today());
      setFormCourseId("");
      setMarks({});
    }
    setShowForm((open) => !open);
  }

  // Saves every unmarked student of the course for the chosen date in one go.
  async function handleSaveAll(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess("");
    if (!formCourseId || !date || pending.length === 0) return;

    const payload = pending.map((en) => ({
      enrollmentId: en.id,
      attendanceDate: date,
      status: statusOf(en.id),
    }));

    const ok = await run(async () => {
      const results = await Promise.allSettled(
        payload.map((p) => api.post("/attendance", p))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        throw new Error(
          `${failed} of ${payload.length} records could not be saved. Press Save again to retry the missing ones.`
        );
      }
    }, "Unable to record attendance.");

    // Reload even after a partial failure so saved students show as recorded.
    await records.reload();

    if (ok) {
      setSuccess(`Attendance saved for ${payload.length} student(s).`);
      setMarks({});
    }
  }

  return (
    <>
      <section className="content-card attendance-compact">
        <div className="section-header">
          <div>
            <h2>Attendance Management</h2>
            <p className="muted-text">
              Record attendance and review student attendance history.
            </p>
          </div>
          <button type="button" onClick={toggleForm}>
            {showForm ? "Cancel" : "+ Record Attendance"}
          </button>
        </div>

        <Alert message={loadError || actionError} />
        <Alert type="success" message={success} />

        {showForm && (
          <form className="form-card" onSubmit={handleSaveAll}>
            <h3>Record Attendance</h3>

            <div className="form-grid form-grid-3">
              <FormField id="formCourse" label="Course">
                <select
                  id="formCourse"
                  value={formCourseId}
                  onChange={(e) => {
                    setFormCourseId(e.target.value);
                    setMarks({});
                  }}
                  required
                >
                  <option value="">Select a course</option>
                  {courses.data.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="attendanceDate" label="Attendance Date">
                <input
                  id="attendanceDate"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setMarks({});
                  }}
                  required
                />
              </FormField>
            </div>

            {!loading && enrollments.data.length === 0 && (
              <p className="muted-text">
                No enrollments found. Create one before recording attendance.
              </p>
            )}

            {formCourseId && courseEnrollments.length === 0 && !loading && (
              <p className="muted-text">No students are enrolled in this course.</p>
            )}

            {formCourseId && courseEnrollments.length > 0 && (
              <>
                <div className="mark-toolbar">
                  <span className="muted-text">
                    {courseEnrollments.length} enrolled
                    {recordedStatus.size > 0 &&
                      ` · ${courseEnrollments.length - pending.length} already recorded`}
                  </span>
                  <span className="mark-summary">
                    <b className="present">{pendingCount("Present")}</b> Present ·{" "}
                    <b className="absent">{pendingCount("Absent")}</b> Absent ·{" "}
                    <b className="late">{pendingCount("Late")}</b> Late
                  </span>
                  <div className="mark-quick">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setAll("Present")}
                      disabled={pending.length === 0}
                    >
                      All Present
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setAll("Absent")}
                      disabled={pending.length === 0}
                    >
                      All Absent
                    </button>
                  </div>
                </div>

                <div className="mark-list">
                  <DataTable
                    title="Students"
                    rows={courseEnrollments}
                    loading={loading}
                    emptyText="No students found."
                    columns={[
                      { header: "Student No.", render: (en) => en.student?.studentNo ?? "—" },
                      { header: "Student", render: (en) => fullName(en.student) },
                      {
                        header: "Attendance",
                        render: (en) => {
                          const saved = recordedStatus.get(en.id);
                          if (saved) {
                            return (
                              <span className={`badge badge-${saved.toLowerCase()}`}>
                                {saved} · recorded
                              </span>
                            );
                          }
                          const current = statusOf(en.id);
                          return (
                            <div
                              className="mark-group"
                              role="radiogroup"
                              aria-label={`Attendance for ${fullName(en.student)}`}
                            >
                              {STATUSES.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  role="radio"
                                  aria-checked={current === s}
                                  className={`mark-btn mark-${s.toLowerCase()}${
                                    current === s ? " active" : ""
                                  }`}
                                  onClick={() =>
                                    setMarks((prev) => ({ ...prev, [en.id]: s }))
                                  }
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          );
                        },
                      },
                    ]}
                  />
                </div>

                {pending.length === 0 && (
                  <p className="muted-text">
                    Attendance for every student in this course is already recorded on this
                    date.
                  </p>
                )}
              </>
            )}

            <div className="form-actions">
              <button type="submit" disabled={busy || !date || pending.length === 0}>
                {busy ? "Saving..." : `Save Attendance (${pending.length})`}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowForm(false)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="filters">
          <FormField id="filterStudent" label="Student">
            <input
              id="filterStudent"
              type="text"
              list="studentOptions"
              placeholder="Type name or number, or pick..."
              autoComplete="off"
              value={studentText}
              onChange={(e) => handleStudentInput(e.target.value)}
            />
            <datalist id="studentOptions">
              {students.data.map((s) => (
                <option key={s.id} value={studentLabel(s)} />
              ))}
            </datalist>
          </FormField>

          <FormField id="filterCourse" label="Course">
            <select
              id="filterCourse"
              value={filters.courseId}
              onChange={(e) => setFilter("courseId", e.target.value)}
            >
              <option value="">All courses</option>
              {courses.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="filterDate" label="Date">
            <input
              id="filterDate"
              type="date"
              value={filters.date}
              onChange={(e) => setFilter("date", e.target.value)}
            />
          </FormField>

          <FormField id="filterStatus" label="Status">
            <select
              id="filterStatus"
              value={filters.status}
              onChange={(e) => setFilter("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>

          <button type="button" className="btn-secondary" onClick={clearFilters}>
            Clear
          </button>
        </div>

        <div className="stat-strip">
          <div className="stat-chip">
            <span>Total</span>
            <strong>{visible.length}</strong>
          </div>
          <div className="stat-chip present">
            <span>Present</span>
            <strong>{countStatus("Present")}</strong>
          </div>
          <div className="stat-chip absent">
            <span>Absent</span>
            <strong>{countStatus("Absent")}</strong>
          </div>
          <div className="stat-chip late">
            <span>Late</span>
            <strong>{countStatus("Late")}</strong>
          </div>
          <div className="stat-chip attendance">
            <span>Attendance %</span>
            <strong>{percentageValue}</strong>
            {filters.studentId && percentage !== null && !percentageError && (
              <div
                className="attendance-meter"
                role="progressbar"
                aria-label="Attendance percentage"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percentage)}
              >
                <div
                  className={`attendance-meter-fill ${percentageLevel}`}
                  style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
        <Alert message={percentageError} />

        <DataTable
          title="Attendance Records"
          rows={visible}
          loading={loading}
          emptyText="No attendance records found."
          columns={[
            { header: "Student", render: (r) => fullName(r.enrollment?.student) },
            { header: "Student No.", render: (r) => r.enrollment?.student?.studentNo ?? "—" },
            {
              header: "Course",
              render: (r) =>
                r.enrollment?.course
                  ? `${r.enrollment.course.code} — ${r.enrollment.course.name}`
                  : "—",
            },
            { header: "Date", render: (r) => r.attendanceDate },
            {
              header: "Status",
              render: (r) => (
                <span className={`badge badge-${r.status.toLowerCase()}`}>
                  {r.status}
                </span>
              ),
            },
          ]}
        />
      </section>
    </>
  );
}