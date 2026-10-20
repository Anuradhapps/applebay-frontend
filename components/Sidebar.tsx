"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const menuItems = [
  { label: "Dashboard", href: "/" },
  { label: "Students", href: "/students" },
  { label: "Courses", href: "/courses" },
  { label: "Enrollments", href: "/enrollments" },
  { label: "Attendance", href: "/attendance" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <p className="menu-title">MAIN MENU</p>

      <nav>
        {menuItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "active" : undefined}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
