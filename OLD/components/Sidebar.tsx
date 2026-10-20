import Link from "next/link";

const menuItems = [
  { label: "Dashboard", href: "/" },
  { label: "Students", href: "/students" },
  { label: "Courses", href: "/courses" },
  { label: "Enrollments", href: "/enrollments" },
  { label: "Attendance", href: "/attendance" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <p className="menu-title">MAIN MENU</p>

      <nav>
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}