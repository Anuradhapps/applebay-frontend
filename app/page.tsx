"use client";

import Link from "next/link";
import Alert from "@/components/Alert";
import StatCard from "@/components/StatCard";
import { useFetch } from "@/hooks/useFetch";

const sections = [
  {
    label: "Students",
    href: "/students",
    desc: "Profiles, contact details and records",
    cta: "Manage",
  },
  {
    label: "Courses",
    href: "/courses",
    desc: "HND and Certificate programmes",
    cta: "Manage",
  },
  {
    label: "Enrollments",
    href: "/enrollments",
    desc: "Student course registrations",
    cta: "Manage",
  },
  {
    label: "Attendance",
    href: "/attendance",
    desc: "Daily attendance tracking",
    cta: "Manage",
  },
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

  const ratio = (a: number, b: number) =>
    loading || b === 0 ? "—" : (a / b).toFixed(1);

  const insights = [
    {
      label: "Enrollments per student",
      value: ratio(enrollments.data.length, students.data.length),
    },
    {
      label: "Students per course",
      value: ratio(students.data.length, courses.data.length),
    },
    {
      label: "Attendance per enrollment",
      value: ratio(attendance.data.length, enrollments.data.length),
    },
  ];

  return (
    <section className="content-card">
      <div className="dash">
            <div className="dash-header">
              <div>
                <h1>Dashboard</h1>
                <p>Applebay Institute — overview of students, courses and attendance.</p>
              </div>
              <button type="button" onClick={reloadAll} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {error && (
              <div className="dash-alert">
                <Alert message={error} />
                <button type="button" className="btn-secondary" onClick={reloadAll}>
                  Try Again
                </button>
              </div>
            )}

            <div className="dash-stats">
              <StatCard
                title="Total Students"
                value={count(students.data.length)}
                description="Registered students"
              />
              <StatCard
                title="Total Courses"
                value={count(courses.data.length)}
                description="HND and Certificate"
              />
              <StatCard
                title="Enrollments"
                value={count(enrollments.data.length)}
                description="Course registrations"
              />
              <StatCard
                title="Attendance"
                value={count(attendance.data.length)}
                description="Attendance records"
              />
            </div>

            <div className="dash-columns">
              <section className="dash-panel">
                <h3 className="dash-panel-title">Quick access</h3>
                <div className="dash-links">
                  {sections.map((s) => (
                    <Link key={s.href} href={s.href} className="dash-link">
                      <div>
                        <strong>{s.label}</strong>
                        <span>{s.desc}</span>
                      </div>
                      <em>{s.cta} →</em>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="dash-panel">
                <h3 className="dash-panel-title">Quick insights</h3>
                <ul className="dash-insights">
                  {insights.map((i) => (
                    <li key={i.label}>
                      <span>{i.label}</span>
                      <strong>{i.value}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
      </div>
    </section>

    
  );
}