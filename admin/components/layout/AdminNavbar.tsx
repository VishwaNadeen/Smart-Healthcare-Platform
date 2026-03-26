import { useNavigate } from "react-router-dom";
import { useAuth } from "../../src/context/AuthContext";

export default function AdminNavbar() {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <h1 className="text-xl font-bold text-sky-700">
        Telemedicine Admin Panel
      </h1>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-700">
            {auth?.user.username || "Admin"}
          </p>
          <p className="text-xs text-slate-500">{auth?.user.email || ""}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
