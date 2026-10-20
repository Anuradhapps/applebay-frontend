
"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";

type Student = {
  id: number;
  studentNo: string;
  firstName: string;
  lastName: string;
};

type Course = {
  id: number;
  code: string;
  name: string;
};

type Enrollment = {
  id: number;
  student: Student;
  course: Course;
};

type EnrollmentForm = {
  studentId: string;
  courseId: string;
};

const emptyForm: EnrollmentForm = {
  studentId: "",
  courseId: "",
};

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState<EnrollmentForm>(emptyForm);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [enrollmentData, studentData, courseData] =
        await Promise.all([
          api.get<Enrollment[]>("/enrollments"),
          api.get<Student[]>("/students"),
          api.get<Course[]>("/courses"),
        ]);

      setEnrollments(enrollmentData);
      setStudents(studentData);
      setCourses(courseData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load enrollment data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function handleFormChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openForm() {
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.studentId || !form.courseId) {
      setError("Please select both a student and a course.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post<Enrollment>("/enrollments", {
        studentId: Number(form.studentId),
        courseId: Number(form.courseId),
      });

      cancelForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create enrollment."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteEnrollment(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this enrollment?"
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete<void>(`/enrollments/${id}`);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete enrollment."
      );
    }
  }

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const searchText = search.toLowerCase().trim();

    const studentName =
      `${enrollment.student?.firstName ?? ""} ${enrollment.student?.lastName ?? ""}`;

    return (
      studentName.toLowerCase().includes(searchText) ||
      (enrollment.student?.studentNo ?? "")
        .toLowerCase()
        .includes(searchText) ||
      (enrollment.course?.name ?? "")
        .toLowerCase()
        .includes(searchText) ||
      (enrollment.course?.code ?? "")
        .toLowerCase()
        .includes(searchText)
    );
  });

  return (
    <>
      <PageHeader
        title="Enrollments"
        description="Register students for institute courses"
      />

      <section className="content-card">
        <div className="section-header">
          <div>
            <h2>Enrollment Management</h2>
            <p className="muted-text">
              Assign students to courses and manage registrations.
            </p>
          </div>

          <button type="button" onClick={openForm}>
            + New Enrollment
          </button>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {showForm && (
          <form
            className="enrollment-form"
            onSubmit={handleSubmit}
          >
            <h3>Register Student for a Course</h3>

            <div className="enrollment-form-grid">
              <div className="form-field">
                <label htmlFor="studentId">Select Student *</label>

                <select
                  id="studentId"
                  name="studentId"
                  value={form.studentId}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">-- Select a student --</option>

                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {student.studentNo} - {student.firstName}{" "}
                      {student.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="courseId">Select Course *</label>

                <select
                  id="courseId"
                  name="courseId"
                  value={form.courseId}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">-- Select a course --</option>

                  {courses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {students.length === 0 && (
              <p className="muted-text">
                No students are available. Register students first.
              </p>
            )}

            {courses.length === 0 && (
              <p className="muted-text">
                No courses are available. Add courses first.
              </p>
            )}

            <div className="form-actions">
              <button
                type="submit"
                disabled={
                  saving ||
                  students.length === 0 ||
                  courses.length === 0
                }
              >
                {saving ? "Registering..." : "Register Enrollment"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={cancelForm}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="enrollment-summary">
          <div className="enrollment-summary-card">
            <span>Total Enrollments</span>
            <strong>{enrollments.length}</strong>
          </div>

          <div className="enrollment-summary-card">
            <span>Available Students</span>
            <strong>{students.length}</strong>
          </div>

          <div className="enrollment-summary-card">
            <span>Available Courses</span>
            <strong>{courses.length}</strong>
          </div>
        </div>

        <div className="enrollment-search">
          <input
            type="search"
            placeholder="Search student number, name or course..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search enrollments"
          />

          {search && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSearch("")}
            >
              Clear
            </button>
          )}
        </div>

        <div className="students-list">
          <div className="table-heading">
            <h3>Enrollment Records</h3>
            <span className="student-count">
              {filteredEnrollments.length} record(s)
            </span>
          </div>

          {loading ? (
            <p className="muted-text">Loading enrollments...</p>
          ) : filteredEnrollments.length === 0 ? (
            <p className="muted-text">
              {search
                ? "No matching enrollments found."
                : "No enrollment records found. Create your first enrollment."}
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Student No.</th>
                    <th>Student Name</th>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEnrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>{enrollment.id}</td>
                      <td>
                        {enrollment.student?.studentNo ?? "—"}
                      </td>
                      <td>
                        {enrollment.student
                          ? `${enrollment.student.firstName} ${enrollment.student.lastName}`
                          : "—"}
                      </td>
                      <td>{enrollment.course?.code ?? "—"}</td>
                      <td>{enrollment.course?.name ?? "—"}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() =>
                              deleteEnrollment(enrollment.id)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
