import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import { doctorNavRoutes } from "../../routes/navRoutes/doctorNavRoutes";
import { patientNavRoutes } from "../../routes/navRoutes/patientNavRoutes";
import type { TelemedicineRole } from "../../utils/telemedicineAuth";

type SideNavBarProps = {
  authRole: TelemedicineRole | null;
  initials: string;
  isAuthenticated: boolean;
  profileImage: string;
  profileName: string;
};

function isConsultationPath(pathname: string) {
  return (
    pathname === "/consultation" ||
    pathname.startsWith("/consultation/") ||
    pathname.startsWith("/doctor-sessions") ||
    pathname.startsWith("/patient-sessions") ||
    pathname.startsWith("/doctor-waiting-room/") ||
    pathname.startsWith("/patient-waiting-room/") ||
    pathname.startsWith("/doctor-session-summary/") ||
    pathname.startsWith("/session-summary/") ||
    pathname.startsWith("/session-history")
  );
}

function isNavItemActive(pathname: string, linkPath: string, isActive: boolean) {
  if (linkPath === "/consultation") {
    return isConsultationPath(pathname);
  }

  if (linkPath === "/appointments" || linkPath === "/appointments/doctor") {
    return pathname === linkPath;
  }

  return isActive;
}

export default function SideNavBar({
  authRole,
  initials,
  isAuthenticated,
  profileImage,
  profileName,
}: SideNavBarProps) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const sidebarLinks =
    authRole === "patient"
      ? patientNavRoutes
      : authRole === "doctor"
      ? doctorNavRoutes
      : [];

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-300 hover:bg-blue-50 hover:text-blue-600"
        aria-label="Open sidebar"
      >
        <div className="relative h-5 w-5">
          <span className="absolute left-0 top-1 h-0.5 w-5 rounded bg-current" />
          <span className="absolute left-0 top-2.5 h-0.5 w-5 rounded bg-current" />
          <span className="absolute left-0 top-4 h-0.5 w-5 rounded bg-current" />
        </div>
      </button>

      {createPortal(
        <>
          <div
            onClick={() => setIsOpen(false)}
            className={`fixed inset-0 z-[60] bg-slate-900/40 transition-all duration-300 ${
              isOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }`}
          />

          <aside
            className={`fixed right-0 top-0 z-[70] h-full w-[300px] border-l border-blue-200 bg-white/95 shadow-2xl backdrop-blur-md transition-all duration-300 ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-blue-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {authRole === "doctor" ? "Doctor Menu" : "Patient Menu"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-300 hover:bg-blue-50 hover:text-blue-600"
                aria-label="Close sidebar"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <div className="flex h-[calc(100%-88px)] flex-col justify-between overflow-y-auto px-4 py-4">
              <div className="grid gap-2">
                {sidebarLinks.map((link, index) => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => {
                      const active = isNavItemActive(
                        location.pathname,
                        link.path,
                        isActive
                      );

                      return `rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                        active
                          ? "bg-blue-100 text-blue-700 shadow-sm"
                          : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                      }`;
                    }}
                    style={{
                      transitionDelay: isOpen ? `${index * 40}ms` : "0ms",
                    }}
                  >
                    {link.name}
                  </NavLink>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-3">
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

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {profileName || "My Profile"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {authRole === "doctor" ? "Doctor" : "Patient"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </>,
        document.body
      )}
    </>
  );
}
