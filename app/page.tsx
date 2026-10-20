"use client";

import Link from "next/link";
import Alert from "@/components/Alert";
import StatCard from "@/components/StatCard";
import { useFetch } from "@/hooks/useFetch";

const sections = [
  { label: "Student Management", href: "/students", cta: "View students →" },
  { label: "Course Management", href: "/courses", cta: "View courses →" },
  { label: "Enrollment Management", href: "/enrollments", cta: "View enrollments →" },
  { label: "Attendance Management", href: "/attendance", cta: "View attendance →" },
];

export default function DashboardPage() {
  const students = useFetch<{ id: number }>("/students");
  const courses = useFetch<{ id: number }>("/courses");
  const enrollments = useFetch<{ id: number }>("/enrollments");
  const attendance = useFetch<{ id: number }>("/attendance");

  const all = [students, courses, enrollments, attendance];
  const loading = all.some((r) => r.loading);
  const error = all.find((r) => r.error)?.error ?? "";

  const reloadAll = () => all.forEach((r) => void r.reload());
  const count = (n: number) => (loading ? "..." : n.toLocaleString());

  return (
    <>
     

      {error && (
        <section className="content-card">
          <Alert message={error} />
          <button type="button" onClick={reloadAll}>
            Try Again
          </button>
        </section>
      )}



      <section className="content-card">
        <div className="section-header">
          <div>
            <h2>Welcome to Applebay Institute</h2>
            <p className="muted-text">
              Manage students, courses, enrollments, and attendance from one
              place.
            </p>
          </div>
          <button type="button" onClick={reloadAll} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
        <div className="stat-grid">
          <StatCard
            title="Total Students"
            value={count(students.data.length)}
            description="Registered students"
          />
          <StatCard
            title="Total Courses"
            value={count(courses.data.length)}
            description="HND and Certificate courses"
          />
          <StatCard
            title="Enrollments"
            value={count(enrollments.data.length)}
            description="Student course registrations"
          />
          <StatCard
            title="Attendance"
            value={count(attendance.data.length)}
            description="Attendance records"
          />
      </div>

        <div className="link-grid">
          {sections.map((s) => (
            <Link key={s.href} href={s.href}>
              <span>{s.label}</span>
              <span>{s.cta}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
