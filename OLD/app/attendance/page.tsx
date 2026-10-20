
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";

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
  student?: Student;
  course?: Course;
  studentId?: number;
  courseId?: number;
};

type Attendance = {
  id: number;
  enrollment?: Enrollment;
  enrollmentId?: number;
  attendanceDate: string;
  status: string;
};

type AttendanceForm = {
  enrollmentId: string;
  attendanceDate: string;
  status: string;
};

const initialForm: AttendanceForm = {
  enrollmentId: "",
  attendanceDate: new Date().toLocaleDateString("en-CA"),
  status: "Present",
};

export default function AttendancePage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [form, setForm] = useState<AttendanceForm>(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [studentFilter, setStudentFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [attendanceData, enrollmentData, studentData, courseData] =
        await Promise.all([
          api.get<Attendance[]>("/attendance"),
          api.get<Enrollment[]>("/enrollments"),
          api.get<Student[]>("/students"),
          api.get<Course[]>("/courses"),
        ]);

      setRecords(attendanceData);
      setEnrollments(enrollmentData);
      setStudents(studentData);
      setCourses(courseData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load attendance data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getStudentName = (student?: Student) => {
    if (!student) return "Unknown student";
    return `${student.firstName} ${student.lastName}`;
  };

  const getEnrollment = (record: Attendance) => {
    return (
      record.enrollment ??
      enrollments.find(
        (item) =>
          item.id === record.enrollmentId
      )
    );
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const enrollment = getEnrollment(record);
      const studentId =
        enrollment?.student?.id ?? enrollment?.studentId;
      const courseId =
        enrollment?.course?.id ?? enrollment?.courseId;

      return (
        (!studentFilter || String(studentId) === studentFilter) &&
        (!courseFilter || String(courseId) === courseFilter) &&
        (!dateFilter || record.attendanceDate === dateFilter) &&
        (!statusFilter || record.status === statusFilter)
      );
    });
  }, [
    records,
    enrollments,
    studentFilter,
    courseFilter,
    dateFilter,
    statusFilter,
  ]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.enrollmentId || !form.attendanceDate || !form.status) {
      setError("Please complete all attendance fields.");
      return;
    }

    setSaving(true);

    try {
      await api.post<Attendance>("/attendance", {
        enrollmentId: form.enrollmentId,
        attendanceDate: form.attendanceDate,
        status: form.status,
      });

      setSuccess("Attendance recorded successfully.");
      setForm({
        ...initialForm,
        attendanceDate: new Date().toLocaleDateString("en-CA"),
      });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to record attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  const presentCount = filteredRecords.filter(
    (record) => record.status?.toLowerCase() === "present"
  ).length;

  const absentCount = filteredRecords.filter(
    (record) => record.status?.toLowerCase() === "absent"
  ).length;

  const lateCount = filteredRecords.filter(
    (record) => record.status?.toLowerCase() === "late"
  ).length;

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Record and manage student attendance"
      />

      <section className="content-card">
        <div className="section-header">
          <div>
            <h2>Attendance Management</h2>
            <p className="muted-text">
              Record attendance and review student attendance history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowForm(!showForm);
            }}
          >
            {showForm ? "Cancel" : "+ Record Attendance"}
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        {showForm && (
          <form onSubmit={handleSubmit} className="attendance-form">
            <h3>Record Student Attendance</h3>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="enrollmentId">Student Enrollment</label>
                <select
                  id="enrollmentId"
                  value={form.enrollmentId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      enrollmentId: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select an enrollment</option>
                  {enrollments.map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {getStudentName(enrollment.student)} —{" "}
                      {enrollment.course?.code ?? "Course unavailable"}{" "}
                      (Enrollment #{enrollment.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="attendanceDate">Attendance Date</label>
                <input
                  id="attendanceDate"
                  type="date"
                  value={form.attendanceDate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      attendanceDate: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="status">Attendance Status</label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                  required
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                </select>
              </div>
            </div>

            {enrollments.length === 0 && !loading && (
              <p className="muted-text">
                No enrollments found. Create a student enrollment before
                recording attendance.
              </p>
            )}

            <div className="form-actions">
              <button
                type="submit"
                disabled={saving || enrollments.length === 0}
              >
                {saving ? "Saving..." : "Save Attendance"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="attendance-summary">
          <div className="attendance-summary-card">
            <span>Total Records</span>
            <strong>{filteredRecords.length}</strong>
          </div>

          <div className="attendance-summary-card">
            <span>Present</span>
            <strong>{presentCount}</strong>
          </div>

          <div className="attendance-summary-card">
            <span>Absent</span>
            <strong>{absentCount}</strong>
          </div>

          <div className="attendance-summary-card">
            <span>Late</span>
            <strong>{lateCount}</strong>
          </div>
        </div>

        <div className="attendance-filters">
          <div className="form-field">
            <label htmlFor="filterStudent">Filter by Student</label>
            <select
              id="filterStudent"
              value={studentFilter}
              onChange={(event) => setStudentFilter(event.target.value)}
            >
              <option value="">All students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.studentNo} — {getStudentName(student)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="filterCourse">Filter by Course</label>
            <select
              id="filterCourse"
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
            >
              <option value="">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="filterDate">Filter by Date</label>
            <input
              id="filterDate"
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="filterStatus">Filter by Status</label>
            <select
              id="filterStatus"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setStudentFilter("");
              setCourseFilter("");
              setDateFilter("");
              setStatusFilter("");
            }}
          >
            Clear Filters
          </button>
        </div>

        <div className="table-wrapper">
          <table className="students-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Student</th>
                <th>Student No.</th>
                <th>Course</th>
                <th>Attendance Date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>Loading attendance records...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6}>No attendance records found.</td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const enrollment = getEnrollment(record);
                  const student = enrollment?.student;
                  const course = enrollment?.course;

                  return (
                    <tr key={record.id}>
                      <td>{record.id}</td>
                      <td>{getStudentName(student)}</td>
                      <td>{student?.studentNo ?? "—"}</td>
                      <td>
                        {course
                          ? `${course.code} — ${course.name}`
                          : "—"}
                      </td>
                      <td>{record.attendanceDate}</td>
                      <td>
                        <span
                          className={`attendance-status attendance-${record.status?.toLowerCase()}`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
