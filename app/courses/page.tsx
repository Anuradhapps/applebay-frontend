"use client";

import { useState } from "react";
import Alert from "@/components/Alert";
import DataTable from "@/components/DataTable";
import FormField from "@/components/FormField";
import RowActions from "@/components/RowActions";
import SearchBar from "@/components/SearchBar";
import StatCard from "@/components/StatCard";
import { useAction } from "@/hooks/useAction";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import type { Course } from "@/lib/types";
import { matches } from "@/lib/utils";

const emptyForm = { code: "", name: "", level: "HND", durationMonths: "" };
type CourseForm = typeof emptyForm;

export default function CoursesPage() {
  const { data: courses, loading, error, setError, reload } =
    useFetch<Course>("/courses");
  const { run, busy } = useAction(setError);

  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const visible = courses.filter((c) => matches(search, c.code, c.name, c.level));
  const countLevel = (level: string) =>
    courses.filter((c) => c.level.toLowerCase() === level).length;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function openForm(course?: Course) {
    setError("");
    setEditingId(course?.id ?? null);
    setForm(
      course
        ? {
            code: course.code,
            name: course.name,
            level: course.level,
            durationMonths: String(course.durationMonths),
          }
        : emptyForm
    );
    setShowForm(true);
    if (course) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      level: form.level,
      durationMonths: Number(form.durationMonths),
    };

    const ok = await run(
      () =>
        editingId !== null
          ? api.put(`/courses/${editingId}`, payload)
          : api.post("/courses", payload),
      "Failed to save course."
    );

    if (ok) {
      closeForm();
      await reload();
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Are you sure you want to delete this course?")) return;

    const ok = await run(
      () => api.delete(`/courses/${id}`),
      "Failed to delete course."
    );
    if (ok) await reload();
  }

  return (
    <>
      <section className="content-card">
        <div className="section-header">
          <div>
            <h2>Course Management</h2>
            <p className="muted-text">
              Create and maintain institute course information.
            </p>
          </div>
          <button type="button" onClick={() => openForm()}>
            + Add Course
          </button>
        </div>

        <Alert message={error} />

        {showForm && (
          <form className="form-card" onSubmit={handleSubmit}>
            <h3>{editingId !== null ? "Edit Course" : "Add New Course"}</h3>

            <div className="form-grid">
              <FormField id="code" label="Course Code *">
                <input
                  id="code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  required
                  maxLength={30}
                  placeholder="e.g. HND-IT"
                />
              </FormField>

              <FormField id="name" label="Course Name *">
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={150}
                />
              </FormField>

              <FormField id="level" label="Course Type *">
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
              </FormField>

              <FormField id="durationMonths" label="Duration (Months) *">
                <input
                  id="durationMonths"
                  name="durationMonths"
                  type="number"
                  min={1}
                  max={120}
                  step={1}
                  value={form.durationMonths}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 24"
                />
              </FormField>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy
                  ? "Saving..."
                  : editingId !== null
                    ? "Update Course"
                    : "Save Course"}
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
          <StatCard title="Total Courses" value={courses.length} />
          <StatCard title="HND Courses" value={countLevel("hnd")} />
          <StatCard title="Certificate Courses" value={countLevel("certificate")} />
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by course code, name or type..."
        />

        <DataTable
          title="Course Records"
          rows={visible}
          loading={loading}
          emptyText={
            search ? "No matching courses found." : "No courses yet. Add your first course."
          }
          columns={[
            { header: "Code", render: (c) => c.code },
            { header: "Name", render: (c) => c.name },
            {
              header: "Type",
              render: (c) => <span className="badge">{c.level}</span>,
            },
            { header: "Duration", render: (c) => `${c.durationMonths} months` },
            {
              header: "Actions",
              render: (c) => (
                <RowActions
                  onEdit={() => openForm(c)}
                  onDelete={() => handleDelete(c.id)}
                />
              ),
            },
          ]}
        />
      </section>
    </>
  );
}
