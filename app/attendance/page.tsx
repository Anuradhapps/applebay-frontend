"use client";

import { useMemo, useState } from "react";
import Alert from "@/components/Alert";
import DataTable from "@/components/DataTable";
import FormField from "@/components/FormField";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { useAction } from "@/hooks/useAction";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import type { Attendance, AttendanceStatus, Course, Enrollment, Student } from "@/lib/types";
import { fullName, today } from "@/lib/utils";

const STATUSES: AttendanceStatus[] = ["Present", "Absent", "Late"];

const emptyFilters = { studentId: "", courseId: "", date: "", status: "" };

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

  const [showForm, setShowForm] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState("");
  // Left empty on first render; today's date is set when the form opens
  // (an event handler), because new Date() can't run during prerender.
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<AttendanceStatus>("Present");
  const [filters, setFilters] = useState(emptyFilters);

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
        return (
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

  function setFilter(key: keyof typeof emptyFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleForm() {
    setActionError("");
    setSuccess("");
    if (!showForm) setDate(today());
    setShowForm((open) => !open);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess("");

    const duplicate = records.data.some(
      (r) =>
        (r.enrollmentId ?? r.enrollment?.id) === Number(enrollmentId) &&
        r.attendanceDate === date
    );
    if (duplicate) {
      setActionError("Attendance for this enrollment is already recorded on that date.");
      return;
    }

    const ok = await run(
      () =>
        api.post("/attendance", {
          enrollmentId: Number(enrollmentId),
          attendanceDate: date,
          status,
        }),
      "Unable to record attendance."
    );

    if (ok) {
      setSuccess("Attendance recorded successfully.");
      setEnrollmentId("");
      setDate("");
      setStatus("Present");
      setShowForm(false);
      await records.reload();
    }
  }

  return (
    <>
      <section className="content-card">
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
          <form className="form-card" onSubmit={handleSubmit}>
            <h3>Record Student Attendance</h3>

            <div className="form-grid form-grid-3">
              <FormField id="enrollmentId" label="Student Enrollment">
                <select
                  id="enrollmentId"
                  value={enrollmentId}
                  onChange={(e) => setEnrollmentId(e.target.value)}
                  required
                >
                  <option value="">Select an enrollment</option>
                  {enrollments.data.map((en) => (
                    <option key={en.id} value={en.id}>
                      {fullName(en.student)} — {en.course?.code ?? "Course unavailable"}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="attendanceDate" label="Attendance Date">
                <input
                  id="attendanceDate"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </FormField>

              <FormField id="status" label="Attendance Status">
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                  required
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {!loading && enrollments.data.length === 0 && (
              <p className="muted-text">
                No enrollments found. Create one before recording attendance.
              </p>
            )}

            <div className="form-actions">
              <button type="submit" disabled={busy || enrollments.data.length === 0}>
                {busy ? "Saving..." : "Save Attendance"}
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

        <div className="stat-grid stat-grid-4">
          <StatCard title="Total Records" value={visible.length} />
          <StatCard title="Present" value={countStatus("Present")} />
          <StatCard title="Absent" value={countStatus("Absent")} />
          <StatCard title="Late" value={countStatus("Late")} />
        </div>

        <div className="filters">
          <FormField id="filterStudent" label="Student">
            <select
              id="filterStudent"
              value={filters.studentId}
              onChange={(e) => setFilter("studentId", e.target.value)}
            >
              <option value="">All students</option>
              {students.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.studentNo} — {fullName(s)}
                </option>
              ))}
            </select>
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

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setFilters(emptyFilters)}
          >
            Clear Filters
          </button>
        </div>

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
