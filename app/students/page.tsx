"use client";

import { useState } from "react";
import Alert from "@/components/Alert";
import DataTable from "@/components/DataTable";
import FormField from "@/components/FormField";
import RowActions from "@/components/RowActions";
import SearchBar from "@/components/SearchBar";
import { useAction } from "@/hooks/useAction";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import type { Student } from "@/lib/types";
import { emptyToNull, fullName, matches } from "@/lib/utils";

const emptyForm = {
  studentNo: "",
  firstName: "",
  lastName: "",
  nic: "",
  email: "",
  phone: "",
  address: "",
  dateOfBirth: "",
};

type StudentForm = typeof emptyForm;

export default function StudentsPage() {
  const { data: students, loading, error, setError, reload } = useFetch<Student>("/students");
  const { run, busy } = useAction(setError);

  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");

  const visible = students.filter((s) =>
    matches(search, s.studentNo, s.firstName, s.lastName, s.nic, s.email)
  );

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function openForm(student?: Student) {
    setError("");
    setSuccess("");
    setEditingId(student?.id ?? null);
    setForm(
      student
        ? {
            studentNo: student.studentNo,
            firstName: student.firstName,
            lastName: student.lastName,
            nic: student.nic,
            email: student.email ?? "",
            phone: student.phone ?? "",
            address: student.address ?? "",
            dateOfBirth: student.dateOfBirth?.substring(0, 10) ?? "",
          }
        : emptyForm
    );
    setShowForm(true);
    if (student) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const payload = {
      studentNo: form.studentNo.trim(),
      nic: form.nic.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: emptyToNull(form.email),
      phone: emptyToNull(form.phone),
      address: emptyToNull(form.address),
      dateOfBirth: emptyToNull(form.dateOfBirth),
    };

    const isEditing = editingId !== null;
    const studentName = `${payload.firstName} ${payload.lastName}`;

    setSuccess("");
    const ok = await run(
      () =>
        isEditing
          ? api.put(`/students/${editingId}`, payload)
          : api.post("/students", payload),
      "Failed to save student."
    );

    if (ok) {
      closeForm();
      await reload();
      setSuccess(
        isEditing
          ? `Student "${studentName}" was updated successfully.`
          : `Student "${studentName}" was created successfully.`
      );
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Are you sure you want to delete this student?")) return;

    const target = students.find((s) => s.id === id);
    const studentName = target ? fullName(target) : "Student";

    setSuccess("");
    const ok = await run(
      () => api.delete(`/students/${id}`),
      "Failed to delete student."
    );
    if (ok) {
      await reload();
      setSuccess(`Student "${studentName}" was deleted successfully.`);
    }
  }

  return (
    <section className="content-card">
      <div className="section-header">
        <div>
          <h2>Students Management</h2>
          <p className="muted-text">
            {loading
              ? "Loading students..."
              : `${students.length.toLocaleString()} registered`}
          </p>
        </div>
        {!showForm && (
          <button type="button" onClick={() => openForm()}>
            + Add Student
          </button>
        )}
      </div>

      <Alert message={error} />
      <Alert
        message={success}
        type="success"
        onClose={() => setSuccess("")}
        autoHideMs={4000}
      />

      {showForm && (
        <form className="form-card" onSubmit={handleSubmit}>
          <h3>{editingId !== null ? "Edit Student" : "New Student"}</h3>

          <div className="form-grid form-grid-3">
            <FormField id="studentNo" label="Student No. *">
              <input
                id="studentNo"
                name="studentNo"
                value={form.studentNo}
                onChange={handleChange}
                required
                maxLength={30}
                placeholder="e.g. STU001"
              />
            </FormField>

            <FormField id="firstName" label="First Name *">
              <input
                id="firstName"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
                maxLength={100}
              />
            </FormField>

            <FormField id="lastName" label="Last Name *">
              <input
                id="lastName"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
                maxLength={100}
              />
            </FormField>

            <FormField id="nic" label="NIC *">
              <input
                id="nic"
                name="nic"
                value={form.nic}
                onChange={handleChange}
                required
                maxLength={20}
              />
            </FormField>

            <FormField id="email" label="Email *">
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="student@example.com"
              />
            </FormField>

            <FormField id="phone" label="Phone">
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                maxLength={20}
              />
            </FormField>

            <FormField id="dateOfBirth" label="Date of Birth">
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleChange}
              />
            </FormField>

            <FormField id="address" label="Address" full>
              <textarea
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={2}
                maxLength={500}
              />
            </FormField>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? "Saving..." : editingId !== null ? "Update" : "Save"}
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

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by name, student no., NIC or email..."
      />

      <DataTable
        title="Student List"
        rows={visible}
        loading={loading}
        emptyText={search ? "No matching students found." : "No students found."}
        columns={[
          { header: "Student No.", render: (s) => s.studentNo },
          { header: "Name", render: (s) => fullName(s) },
          { header: "NIC", render: (s) => s.nic },
          { header: "Email", render: (s) => s.email || "—" },
          { header: "Phone", render: (s) => s.phone || "—" },
          {
            header: "Actions",
            render: (s) => (
              <RowActions
                onEdit={() => openForm(s)}
                onDelete={() => handleDelete(s.id)}
              />
            ),
          },
        ]}
      />
    </section>
  );
}