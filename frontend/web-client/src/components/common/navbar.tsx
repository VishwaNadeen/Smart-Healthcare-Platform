import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { logoutUser } from "../../services/authApi";
import {
  clearTelemedicineAuth,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Doctors", path: "/doctors" },
  { name: "Appointments", path: "/appointments" },
  { name: "Consultation", path: "/consultation" },
];

function getProfileImage() {
  return localStorage.getItem("patientProfileImage") || "";
}

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

  return "U";
}

export default function Navbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = getStoredTelemedicineAuth();

  const storedPatientName =
    localStorage.getItem("patientProfileName") ||
    auth.username ||
    "";

  const profileImage = getProfileImage();
  const initials = getInitials(storedPatientName, auth.email ?? undefined);

  async function handleLogout() {
    setActionError("");
    setIsSubmitting(true);

    try {
      if (auth.token) {
        await logoutUser(auth.token);
      }
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : "Failed to log out cleanly."
      );
    } finally {
      clearTelemedicineAuth();
      setIsSubmitting(false);
      setIsOpen(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-blue-200/40 bg-white/80 backdrop-blur-md shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group flex items-center gap-2 transition-transform duration-300 hover:scale-[1.02]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-md transition-all duration-300 group-hover:rotate-6 group-hover:shadow-lg">
            S
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 sm:text-xl">
              Smart Healthcare
            </h1>
            <p className="text-xs text-slate-500">Care made simple</p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `group relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                }`
              }
            >
              {link.name}
              <span className="absolute left-1/2 top-full h-0.5 w-0 -translate-x-1/2 rounded-full bg-blue-600 transition-all duration-300 group-hover:w-2/3" />
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {auth.isAuthenticated ? (
            <>
              <Link
                to={auth.role === "patient" ? "/patient/profile" : "/"}
                className="group flex items-center gap-3 rounded-full px-2 py-1 transition hover:bg-blue-50"
                title="My Profile"
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-blue-200"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white ring-2 ring-blue-200">
                    {initials}
                  </div>
                )}

                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-slate-800">
                    {storedPatientName || "My Profile"}
                  </p>
                  <p className="text-xs text-slate-500">View profile</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isSubmitting}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:opacity-70"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signup"
                className="rounded-full border border-blue-200 bg-white px-5 py-2 text-sm font-semibold text-blue-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
              >
                Sign Up
              </Link>

              <Link
                to="/login"
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
              >
                Login
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-300 hover:bg-blue-50 hover:text-blue-600 md:hidden"
          aria-label="Toggle menu"
        >
          <div className="relative h-5 w-5">
            <span
              className={`absolute left-0 top-1 h-0.5 w-5 rounded bg-current transition-all duration-300 ${
                isOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-2.5 h-0.5 w-5 rounded bg-current transition-all duration-300 ${
                isOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-4 h-0.5 w-5 rounded bg-current transition-all duration-300 ${
                isOpen ? "-translate-y-1 -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </nav>

      <div
        className={`overflow-hidden border-t border-blue-100 bg-white/95 backdrop-blur-md transition-all duration-300 md:hidden ${
          isOpen ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}

          {actionError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          {auth.isAuthenticated ? (
            <div className="mt-2 grid gap-3">
              <Link
                to={auth.role === "patient" ? "/patient/profile" : "/"}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-blue-50"
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-blue-200"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white ring-2 ring-blue-200">
                    {initials}
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {storedPatientName || "My Profile"}
                  </p>
                  <p className="text-xs text-slate-500">Open profile</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isSubmitting}
                className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-all duration-300 hover:bg-blue-700 disabled:opacity-70"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Link
                to="/signup"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-center text-sm font-semibold text-blue-700 transition-all duration-300 hover:bg-blue-50"
              >
                Sign Up
              </Link>

              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-all duration-300 hover:bg-blue-700"
              >
                Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
