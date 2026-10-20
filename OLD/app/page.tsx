
"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { api } from "@/lib/api";

type Student = {
  id: number;
};

type Course = {
  id: number;
};

type Enrollment = {
  id: number;
};

type Attendance = {
  id: number;
};

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [studentData, courseData, enrollmentData, attendanceData] =
        await Promise.all([
          api.get<Student[]>("/students"),
          api.get<Course[]>("/courses"),
          api.get<Enrollment[]>("/enrollments"),
          api.get<Attendance[]>("/attendance"),
        ]);

      setStudents(studentData);
      setCourses(courseData);
      setEnrollments(enrollmentData);
      setAttendance(attendanceData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of Applebay Institute"
      />

      {error && (
        <section className="content-card dashboard-error">
          <p className="error-message">{error}</p>
          <button type="button" onClick={() => void loadDashboard()}>
            Try Again
          </button>
        </section>
      )}

      <div className="dashboard-grid">
        <StatCard
          title="Total Students"
          value={loading ? "..." : students.length.toLocaleString()}
          description="Registered students"
        />

        <StatCard
          title="Total Courses"
          value={loading ? "..." : courses.length.toLocaleString()}
          description="HND and Certificate courses"
        />

        <StatCard
          title="Enrollments"
          value={loading ? "..." : enrollments.length.toLocaleString()}
          description="Student course registrations"
        />

        <StatCard
          title="Attendance"
          value={loading ? "..." : attendance.length.toLocaleString()}
          description="Attendance records"
        />
      </div>

      <section className="content-card dashboard-welcome">
        <div>
          <h2>Welcome to Applebay Institute</h2>
          <p>
            Manage students, courses, enrollments, and attendance from one
            place.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </section>

      <section className="content-card dashboard-overview">
        <h2>System Overview</h2>

        <div className="dashboard-overview-list">
          <a href="/students">
            <span>Student Management</span>
            <span>View students →</span>
          </a>

          <a href="/courses">
            <span>Course Management</span>
            <span>View courses →</span>
          </a>

          <a href="/enrollments">
            <span>Enrollment Management</span>
            <span>View enrollments →</span>
          </a>

          <a href="/attendance">
            <span>Attendance Management</span>
            <span>View attendance →</span>
          </a>
        </div>
      </section>
    </>
  );
}
