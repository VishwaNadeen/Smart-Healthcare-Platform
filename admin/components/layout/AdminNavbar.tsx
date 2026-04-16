import { useNavigate } from "react-router-dom";
import { useAuth } from "../../src/context/AuthContext";

function getInitials(name?: string, email?: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return parts[0][0].toUpperCase();
  }

  if (email && email.trim()) {
    return email[0].toUpperCase();
  }

  return "A";
}

export default function AdminNavbar() {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();

  const username = auth?.user.username || "Admin";
  const email = auth?.user.email || "";
  const initials = getInitials(username, email);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-blue-200/40 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-md">
            {initials}
          </div>

          <div>
            <h1 className="text-lg font-bold text-slate-800 sm:text-xl">
              Smart Healthcare
            </h1>
            <p className="text-xs text-slate-500">Admin control center</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-700">{username}</p>
            <p className="text-xs text-slate-500">{email}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
