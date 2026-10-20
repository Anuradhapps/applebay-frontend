"use client";

import { useState } from "react";
import Alert from "@/components/Alert";
import DataTable from "@/components/DataTable";
import FormField from "@/components/FormField";
import PageHeader from "@/components/PageHeader";
import RowActions from "@/components/RowActions";
import SearchBar from "@/components/SearchBar";
import StatCard from "@/components/StatCard";
import { useAction } from "@/hooks/useAction";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import type { Course, Enrollment, Student } from "@/lib/types";
import { fullName, matches } from "@/lib/utils";

export default function EnrollmentsPage() {
  const enrollments = useFetch<Enrollment>("/enrollments");
  const students = useFetch<Student>("/students");
  const courses = useFetch<Course>("/courses");

  const loading = enrollments.loading || students.loading || courses.loading;
  const loadError = enrollments.error || students.error || courses.error;

  const [actionError, setActionError] = useState("");
  const { run, busy } = useAction(setActionError);

  const [showForm, setShowForm] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [search, setSearch] = useState("");

  const visible = enrollments.data.filter((e) =>
    matches(
      search,
      fullName(e.student),
      e.student?.studentNo,
      e.course?.name,
      e.course?.code
    )
  );

  const canSubmit = students.data.length > 0 && courses.data.length > 0;

  function closeForm() {
    setShowForm(false);
    setStudentId("");
    setCourseId("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const ok = await run(
      () =>
        api.post("/enrollments", {
          studentId: Number(studentId),
          courseId: Number(courseId),
        }),
      "Failed to create enrollment."
    );

    if (ok) {
      closeForm();
      await enrollments.reload();
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Are you sure you want to delete this enrollment?")) return;

    const ok = await run(
      () => api.delete(`/enrollments/${id}`),
      "Failed to delete enrollment."
    );
    if (ok) await enrollments.reload();
  }

  return (
    <>
      <section className="content-card">
        <div className="section-header">
          <div>
            <h2>Enrollment Management</h2>
            <p className="muted-text">
              Assign students to courses and manage registrations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActionError("");
              setShowForm(true);
            }}
          >
            + New Enrollment
          </button>
        </div>

        <Alert message={loadError || actionError} />

        {showForm && (
          <form className="form-card" onSubmit={handleSubmit}>
            <h3>Register Student for a Course</h3>

            <div className="form-grid">
              <FormField id="studentId" label="Select Student *">
                <select
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                >
                  <option value="">-- Select a student --</option>
                  {students.data.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.studentNo} - {fullName(s)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="courseId" label="Select Course *">
                <select
                  id="courseId"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  required
                >
                  <option value="">-- Select a course --</option>
                  {courses.data.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {!loading && !canSubmit && (
              <p className="muted-text">
                You need at least one student and one course before enrolling.
              </p>
            )}

            <div className="form-actions">
              <button type="submit" disabled={busy || !canSubmit}>
                {busy ? "Registering..." : "Register Enrollment"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeForm}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="stat-grid stat-grid-3">
          <StatCard title="Total Enrollments" value={enrollments.data.length} />
          <StatCard title="Available Students" value={students.data.length} />
          <StatCard title="Available Courses" value={courses.data.length} />
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search student number, name or course..."
        />

        <DataTable
          title="Enrollment Records"
          rows={visible}
          loading={loading}
          emptyText={
            search
              ? "No matching enrollments found."
              : "No enrollments yet. Create your first one."
          }
          columns={[
            { header: "Student No.", render: (e) => e.student?.studentNo ?? "—" },
            { header: "Student", render: (e) => fullName(e.student) },
            { header: "Course Code", render: (e) => e.course?.code ?? "—" },
            { header: "Course Name", render: (e) => e.course?.name ?? "—" },
            {
              header: "Actions",
              render: (e) => <RowActions onDelete={() => handleDelete(e.id)} />,
            },
          ]}
        />
      </section>
    </>
  );
}
