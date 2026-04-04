import { NavLink } from "react-router-dom";

const baseClass = "block rounded-xl px-4 py-3 text-sm font-medium transition";
const activeClass = "bg-sky-600 text-white";
const inactiveClass = "text-slate-700 hover:bg-sky-100";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
};

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/users", label: "Users" },
  { to: "/doctors", label: "Doctors" },
  { to: "/doctor-specialties", label: "Specialties" },
  { to: "/appointments", label: "Appointments" },
  { to: "/payments", label: "Payments" },
  { to: "/operations", label: "Platform Operations" },
];

export default function AdminSidebar() {
  return (
    <aside className="sticky top-16 h-[calc(100vh-64px)] w-64 border-r border-slate-200 bg-white p-4">
      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `${baseClass} ${isActive ? activeClass : inactiveClass}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
