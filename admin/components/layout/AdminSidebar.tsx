import { NavLink } from "react-router-dom";

const baseClass = "block rounded-xl px-4 py-3 text-sm font-medium transition";
const activeClass = "bg-sky-600 text-white";
const inactiveClass = "text-slate-700 hover:bg-sky-100";

export default function AdminSidebar() {
  return (
    <aside className="min-h-[calc(100vh-64px)] w-64 border-r border-slate-200 bg-white p-4">
      <nav className="space-y-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${baseClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/sessions"
          className={({ isActive }) =>
            `${baseClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          Sessions
        </NavLink>

        <NavLink
          to="/prescriptions"
          className={({ isActive }) =>
            `${baseClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          Prescriptions
        </NavLink>

        <NavLink
          to="/files"
          className={({ isActive }) =>
            `${baseClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          Files
        </NavLink>

        <NavLink
          to="/users"
          className={({ isActive }) =>
            `${baseClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          Users
        </NavLink>
      </nav>
    </aside>
  );
}