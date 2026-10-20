
"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";

type Course = {
  id: number;
  code: string;
  name: string;
  level: string;
  durationMonths: number;
};

type CourseForm = {
  code: string;
  name: string;
  level: string;
  durationMonths: string;
};

const emptyForm: CourseForm = {
  code: "",
  name: "",
  level: "HND",
  durationMonths: "",
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await api.get<Course[]>("/courses");
      setCourses(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load courses."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function startEdit(course: Course) {
    setForm({
      code: course.code,
      name: course.name,
      level: course.level,
      durationMonths: String(course.durationMonths),
    });

    setEditingId(course.id);
    setShowForm(true);
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        level: form.level,
        durationMonths: Number(form.durationMonths),
      };

      if (editingId !== null) {
        await api.put<Course>(`/courses/${editingId}`, payload);
      } else {
        await api.post<Course>("/courses", payload);
      }

      cancelForm();
      await loadCourses();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save course."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this course?"
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete<void>(`/courses/${id}`);
      await loadCourses();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete course."
      );
    }
  }

  const filteredCourses = courses.filter((course) => {
    const term = search.trim().toLowerCase();

    return (
      course.code.toLowerCase().includes(term) ||
      course.name.toLowerCase().includes(term) ||
      course.level.toLowerCase().includes(term)
    );
  });

  const hndCount = courses.filter(
    (course) => course.level.toLowerCase() === "hnd"
  ).length;

  const certificateCount = courses.filter(
    (course) => course.level.toLowerCase() === "certificate"
  ).length;

  return (
    <>
      <PageHeader
        title="Courses"
        description="Manage HND and Certificate courses"
      />

      <section className="content-card">
        <div className="section-header">
          <div>
            <h2>Course Management</h2>
            <p className="muted-text">
              Create and maintain institute course information.
            </p>
          </div>

          <button type="button" onClick={openAddForm}>
            + Add Course
          </button>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {showForm && (
          <form className="course-form" onSubmit={handleSubmit}>
            <h3>
              {editingId !== null ? "Edit Course" : "Add New Course"}
            </h3>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="code">Course Code *</label>
                <input
                  id="code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  required
                  maxLength={30}
                  placeholder="e.g. HND-IT"
                />
              </div>

              <div className="form-field">
                <label htmlFor="name">Course Name *</label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={150}
                  placeholder="Enter course name"
                />
              </div>

              <div className="form-field">
                <label htmlFor="level">Course Type *</label>
                <select
                  id="level"
                  name="level"
                  value={form.level}
                  onChange={handleChange}
                  required
                >
                  <option value="HND">HND</option>
                  <option value="Certificate">Certificate</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="durationMonths">
                  Duration (Months) *
                </label>
                <input
                  id="durationMonths"
                  name="durationMonths"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  value={form.durationMonths}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 24"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Update Course"
                    : "Save Course"}
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

        <div className="course-summary">
          <div className="course-summary-card">
            <span>Total Courses</span>
            <strong>{courses.length}</strong>
          </div>

          <div className="course-summary-card">
            <span>HND Courses</span>
            <strong>{hndCount}</strong>
          </div>

          <div className="course-summary-card">
            <span>Certificate Courses</span>
            <strong>{certificateCount}</strong>
          </div>
        </div>

        <div className="course-search">
          <input
            type="search"
            aria-label="Search courses"
            placeholder="Search by course code, name or type..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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
            <h3>Course Records</h3>
            <span className="student-count">
              {filteredCourses.length} course(s)
            </span>
          </div>

          {loading ? (
            <p className="muted-text">Loading courses...</p>
          ) : filteredCourses.length === 0 ? (
            <p className="muted-text">
              {search
                ? "No matching courses found."
                : "No courses found. Add your first course."}
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCourses.map((course) => (
                    <tr key={course.id}>
                      <td>{course.id}</td>
                      <td>{course.code}</td>
                      <td>{course.name}</td>
                      <td>
                        <span className="course-level-badge">
                          {course.level}
                        </span>
                      </td>
                      <td>{course.durationMonths} months</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="edit-button"
                            onClick={() => startEdit(course)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => deleteCourse(course.id)}
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
