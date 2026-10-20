
"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";

type Student = {
  id: number;
  studentNo: string;
  firstName: string;
  lastName: string;
  nic: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
};

type StudentForm = {
  studentNo: string;
  firstName: string;
  lastName: string;
  nic: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
};

const emptyForm: StudentForm = {
  studentNo: "",
  firstName: "",
  lastName: "",
  nic: "",
  email: "",
  phone: "",
  address: "",
  dateOfBirth: "",
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const loadStudents = useCallback(async (searchTerm = "") => {
    try {
      setLoading(true);
      setError("");

      const endpoint = searchTerm.trim()
        ? `/students/search?name=${encodeURIComponent(searchTerm.trim())}`
        : "/students";

      const data = await api.get<Student[]>(endpoint);
      setStudents(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load students."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
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

  function startEdit(student: Student) {
    setForm({
      studentNo: student.studentNo ?? "",
      firstName: student.firstName ?? "",
      lastName: student.lastName ?? "",
      nic: student.nic ?? "",
      email: student.email ?? "",
      phone: student.phone ?? "",
      address: student.address ?? "",
      dateOfBirth: student.dateOfBirth
        ? student.dateOfBirth.substring(0, 10)
        : "",
    });

    setEditingId(student.id);
    setError("");
    setShowForm(true);

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

      if (editingId !== null) {
        await api.put<Student>(`/students/${editingId}`, form);
      } else {
        await api.post<Student>("/students", form);
      }

      cancelForm();
      await loadStudents(search);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save student."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this student?"
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete<void>(`/students/${id}`);

      await loadStudents(search);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete student."
      );
    }
  }

  async function handleSearch(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    await loadStudents(search);
  }

  async function resetSearch() {
    setSearch("");
    await loadStudents("");
  }

  return (
    <>
      <PageHeader
        title="Students"
        description="Manage student registration and information"
      />

      <section className="content-card">
        <div className="section-header">
          <div>
            <h2>Student Management</h2>
            <p className="muted-text">
              View and manage registered students.
            </p>
          </div>

          <button type="button" onClick={openAddForm}>
            + Add Student
          </button>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {showForm && (
          <form className="student-form" onSubmit={handleSubmit}>
            <h3>
              {editingId !== null ? "Edit Student" : "Register New Student"}
            </h3>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="studentNo">Student Number *</label>
                <input
                  id="studentNo"
                  name="studentNo"
                  value={form.studentNo}
                  onChange={handleChange}
                  required
                  maxLength={30}
                  placeholder="e.g. STU001"
                />
              </div>

              <div className="form-field">
                <label htmlFor="nic">NIC *</label>
                <input
                  id="nic"
                  name="nic"
                  value={form.nic}
                  onChange={handleChange}
                  required
                  maxLength={20}
                  placeholder="National Identity Card"
                />
              </div>

              <div className="form-field">
                <label htmlFor="firstName">First Name *</label>
                <input
                  id="firstName"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  maxLength={100}
                />
              </div>

              <div className="form-field">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  id="lastName"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  maxLength={100}
                />
              </div>

              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  maxLength={150}
                  placeholder="student@example.com"
                />
              </div>

              <div className="form-field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  maxLength={20}
                />
              </div>

              <div className="form-field">
                <label htmlFor="dateOfBirth">Date of Birth</label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field full-width">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={3}
                  maxLength={500}
                  placeholder="Enter the student's address"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Update Student"
                    : "Save Student"}
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

        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by student name..."
            aria-label="Search students by name"
          />

          <button type="submit">Search</button>

          <button
            type="button"
            className="secondary-button"
            onClick={resetSearch}
          >
            Reset
          </button>
        </form>

        <div className="students-list">
          <div className="table-heading">
            <h3>Registered Students</h3>
            <span className="student-count">
              {students.length} student(s)
            </span>
          </div>

          {loading ? (
            <p className="muted-text">Loading students...</p>
          ) : students.length === 0 ? (
            <p className="muted-text">No students found.</p>
          ) : (
            <div className="table-wrapper">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Student No.</th>
                    <th>Name</th>
                    <th>NIC</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.id}</td>
                      <td>{student.studentNo}</td>
                      <td>
                        {student.firstName} {student.lastName}
                      </td>
                      <td>{student.nic}</td>
                      <td>{student.email || "—"}</td>
                      <td>{student.phone || "—"}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="edit-button"
                            onClick={() => startEdit(student)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => deleteStudent(student.id)}
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
