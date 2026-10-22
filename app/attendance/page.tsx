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

const STATUSES: AttendanceStatus[] = ["Present", "Absent"];

const emptyFilters = { search: "", studentId: "", courseId: "", date: "", status: "" };

type Mode = "class" | "single";
type ClassView = "grid" | "list";

// "Nimal Perera" -> "NP", used for the avatar on the roll-call tiles.
function initialsOf(name: string) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Present / Absent segmented toggle, used in both recording modes.
function StatusToggle({
  value,
  onChange,
  label,
}: {
  value: AttendanceStatus;
  onChange: (s: AttendanceStatus) => void;
  label: string;
}) {
  return (
    <div className="mark-group" role="radiogroup" aria-label={label}>
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          className={`mark-btn mark-${s.toLowerCase()}${value === s ? " active" : ""}`}
          onClick={() => onChange(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

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

  // ---- Record attendance form ----
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<Mode>("class");
  // Left empty on first render; today's date is set when the form opens
  // (an event handler), because new Date() can't run during prerender.
  const [date, setDate] = useState("");

  // Whole-class mode
  const [formCourseId, setFormCourseId] = useState("");
  const [classSearch, setClassSearch] = useState("");
  // Roll-call tiles (default) or the table list.
  const [classView, setClassView] = useState<ClassView>("grid");
  // Only students whose status was changed are stored; everyone else is "Present".
  const [marks, setMarks] = useState<Record<number, AttendanceStatus>>({});

  // Individual mode
  const [singleStudentText, setSingleStudentText] = useState("");
  const [singleStudentId, setSingleStudentId] = useState("");
  const [singleEnrollmentId, setSingleEnrollmentId] = useState("");
  const [singleStatus, setSingleStatus] = useState<AttendanceStatus>("Present");

  // ---- Table filters ----
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

  // Enrollments that already have attendance on the chosen date (id -> status).
  // Shared by both modes so nothing is recorded twice for the same day.
  const recordedStatus = useMemo(() => {
    const map = new Map<number, AttendanceStatus>();
    if (!date) return map;
    records.data.forEach((r) => {
      const id = r.enrollmentId ?? r.enrollment?.id;
      if (id !== undefined && r.attendanceDate === date) map.set(id, r.status);
    });
    return map;
  }, [records.data, date]);

  // Whole class: students enrolled in the chosen course, ordered by student number.
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

  // Whole class: rows shown after the in-class search box.
  const classRows = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    if (!q) return courseEnrollments;
    return courseEnrollments.filter(
      (en) =>
        String(fullName(en.student)).toLowerCase().includes(q) ||
        String(en.student?.studentNo ?? "").toLowerCase().includes(q)
    );
  }, [courseEnrollments, classSearch]);

  // Whole class: students still waiting to be marked for this course + date.
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

  // Individual: the courses the chosen student is enrolled in.
  const singleEnrollments = useMemo(
    () =>
      singleStudentId
        ? enrollments.data.filter(
            (en) => String(en.student?.id ?? en.studentId) === singleStudentId
          )
        : [],
    [enrollments.data, singleStudentId]
  );

  const singleRecorded = singleEnrollmentId
    ? recordedStatus.get(Number(singleEnrollmentId))
    : undefined;

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

  // Same combined box in the Individual form; auto-picks the course if the
  // student has only one enrollment.
  function handleSingleStudentInput(value: string) {
    setSingleStudentText(value);
    const match = students.data.find((s) => studentLabel(s) === value);
    const id = match ? String(match.id) : "";
    setSingleStudentId(id);
    const list = id
      ? enrollments.data.filter((en) => String(en.student?.id ?? en.studentId) === id)
      : [];
    setSingleEnrollmentId(list.length === 1 ? String(list[0].id) : "");
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setStudentText("");
  }

  function resetFormFields() {
    setFormCourseId("");
    setClassSearch("");
    setMarks({});
    setSingleStudentText("");
    setSingleStudentId("");
    setSingleEnrollmentId("");
    setSingleStatus("Present");
  }

  function toggleForm() {
    setActionError("");
    setSuccess("");
    if (!showForm) {
      setDate(today());
      setMode("class");
      resetFormFields();
    }
    setShowForm((open) => !open);
  }

  function switchMode(next: Mode) {
    setActionError("");
    setSuccess("");
    setMode(next);
  }

  // Whole class: saves every unmarked student of the course for the date in one go.
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

  // Individual: saves a single student's attendance for the date.
  async function handleSaveSingle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess("");
    if (!singleEnrollmentId || !date) return;

    if (singleRecorded) {
      setActionError("Attendance for this student is already recorded on that date.");
      return;
    }

    const ok = await run(
      () =>
        api.post("/attendance", {
          enrollmentId: Number(singleEnrollmentId),
          attendanceDate: date,
          status: singleStatus,
        }),
      "Unable to record attendance."
    );

    if (ok) {
      setSuccess("Attendance recorded successfully.");
      // Ready for the next student; the date stays so entries can be chained.
      setSingleStudentText("");
      setSingleStudentId("");
      setSingleEnrollmentId("");
      setSingleStatus("Present");
      await records.reload();
    }
  }

  const saveDisabled =
    busy ||
    !date ||
    (mode === "class"
      ? pending.length === 0
      : !singleEnrollmentId || Boolean(singleRecorded));

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
          <form
            className="form-card"
            onSubmit={mode === "class" ? handleSaveAll : handleSaveSingle}
          >
            <div className="mark-header">
              <h3>Record Attendance</h3>
              <div className="mode-tabs" role="tablist" aria-label="Recording mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "class"}
                  className={`mode-tab${mode === "class" ? " active" : ""}`}
                  onClick={() => switchMode("class")}
                >
                  Whole Class
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "single"}
                  className={`mode-tab${mode === "single" ? " active" : ""}`}
                  onClick={() => switchMode("single")}
                >
                  Individual
                </button>
              </div>
            </div>

            {!loading && enrollments.data.length === 0 && (
              <p className="muted-text">
                No enrollments found. Create one before recording attendance.
              </p>
            )}

            {/* ---------------- Whole class ---------------- */}
            {mode === "class" && (
              <>
                <div className="form-grid form-grid-3">
                  <FormField id="formCourse" label="Course">
                    <select
                      id="formCourse"
                      value={formCourseId}
                      onChange={(e) => {
                        setFormCourseId(e.target.value);
                        setClassSearch("");
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
                        <b className="absent">{pendingCount("Absent")}</b> Absent
                      </span>
                      <input
                        type="search"
                        className="mark-search"
                        placeholder="Search in this class..."
                        aria-label="Search students in this class"
                        value={classSearch}
                        onChange={(e) => setClassSearch(e.target.value)}
                      />
                      <div className="mode-tabs" role="tablist" aria-label="Student view">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={classView === "grid"}
                          className={`mode-tab${classView === "grid" ? " active" : ""}`}
                          onClick={() => setClassView("grid")}
                        >
                          Grid
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={classView === "list"}
                          className={`mode-tab${classView === "list" ? " active" : ""}`}
                          onClick={() => setClassView("list")}
                        >
                          List
                        </button>
                      </div>
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
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setMarks({})}
                          disabled={Object.keys(marks).length === 0}
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {classView === "grid" ? (
                      <>
                        <p className="muted-text roll-hint">
                          Everyone starts as Present. Click a student to toggle Absent.
                        </p>
                        {classRows.length === 0 ? (
                          <p className="muted-text">No matching students.</p>
                        ) : (
                          <div className="roll-grid">
                            {classRows.map((en) => {
                              const saved = recordedStatus.get(en.id);
                              const current = saved ?? statusOf(en.id);
                              const name = fullName(en.student);
                              return (
                                <button
                                  key={en.id}
                                  type="button"
                                  disabled={Boolean(saved)}
                                  aria-pressed={current === "Absent"}
                                  title={
                                    saved
                                      ? `${saved} · already recorded`
                                      : "Click to toggle Present / Absent"
                                  }
                                  className={`roll-tile ${current.toLowerCase()}${
                                    saved ? " locked" : ""
                                  }`}
                                  onClick={() =>
                                    setMarks((prev) => ({
                                      ...prev,
                                      [en.id]: current === "Present" ? "Absent" : "Present",
                                    }))
                                  }
                                >
                                  <span className="roll-avatar">{initialsOf(name)}</span>
                                  <span className="roll-text">
                                    <span className="roll-name">{name}</span>
                                    <span className="roll-no">
                                      {en.student?.studentNo ?? "—"}
                                    </span>
                                  </span>
                                  <span className="roll-state">
                                    {saved ? `✓ ${saved}` : current}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                    <div className="mark-list">
                      <DataTable
                        title="Students"
                        rows={classRows}
                        loading={loading}
                        emptyText="No matching students."
                        columns={[
                          {
                            header: "Student No.",
                            render: (en) => en.student?.studentNo ?? "—",
                          },
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
                              return (
                                <StatusToggle
                                  value={statusOf(en.id)}
                                  label={`Attendance for ${fullName(en.student)}`}
                                  onChange={(s) =>
                                    setMarks((prev) => ({ ...prev, [en.id]: s }))
                                  }
                                />
                              );
                            },
                          },
                        ]}
                      />
                    </div>
                    )}

                    {pending.length === 0 && (
                      <p className="muted-text">
                        Attendance for every student in this course is already recorded
                        on this date.
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            {/* ---------------- Individual ---------------- */}
            {mode === "single" && (
              <>
                <div className="form-grid form-grid-3">
                  <FormField id="singleStudent" label="Student">
                    <input
                      id="singleStudent"
                      type="text"
                      list="singleStudentOptions"
                      placeholder="Type name or number, or pick..."
                      autoComplete="off"
                      value={singleStudentText}
                      onChange={(e) => handleSingleStudentInput(e.target.value)}
                      required
                    />
                    <datalist id="singleStudentOptions">
                      {students.data.map((s) => (
                        <option key={s.id} value={studentLabel(s)} />
                      ))}
                    </datalist>
                  </FormField>

                  <FormField id="singleCourse" label="Course">
                    <select
                      id="singleCourse"
                      value={singleEnrollmentId}
                      onChange={(e) => setSingleEnrollmentId(e.target.value)}
                      disabled={!singleStudentId}
                      required
                    >
                      <option value="">
                        {singleStudentId ? "Select a course" : "Pick a student first"}
                      </option>
                      {singleEnrollments.map((en) => (
                        <option key={en.id} value={en.id}>
                          {en.course
                            ? `${en.course.code} — ${en.course.name}`
                            : "Course unavailable"}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField id="singleDate" label="Attendance Date">
                    <input
                      id="singleDate"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </FormField>
                </div>

                {singleStudentId && singleEnrollments.length === 0 && !loading && (
                  <p className="muted-text">This student has no course enrollments.</p>
                )}

                <div className="single-status">
                  <span className="mark-label">Status</span>
                  <StatusToggle
                    value={singleStatus}
                    onChange={setSingleStatus}
                    label="Attendance status"
                  />
                  {singleRecorded && (
                    <span className="muted-text">
                      Already recorded on this date as{" "}
                      <span className={`badge badge-${singleRecorded.toLowerCase()}`}>
                        {singleRecorded}
                      </span>
                    </span>
                  )}
                </div>
              </>
            )}

            <div className="form-actions">
              <button type="submit" disabled={saveDisabled}>
                {busy
                  ? "Saving..."
                  : mode === "class"
                  ? `Save Attendance (${pending.length})`
                  : "Save Attendance"}
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