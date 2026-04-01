import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "./ToastProvider";
import { logoutUser } from "../../services/authApi";
import { getCurrentDoctorProfile } from "../../services/doctorApi";
import { getCurrentPatientProfile } from "../../services/patientApi";
import {
  clearTelemedicineAuth,
  getPostLoginPath,
  getStoredTelemedicineAuth,
  type TelemedicineRole,
} from "../../utils/telemedicineAuth";

const PATIENT_PROFILE_NAME_KEY = "patientProfileName";
const PATIENT_PROFILE_IMAGE_KEY = "patientProfileImage";
const DOCTOR_PROFILE_NAME_KEY = "doctorProfileName";
const DOCTOR_PROFILE_IMAGE_KEY = "doctorProfileImage";
const PROFILE_UPDATED_EVENT = "patient-profile-updated";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Doctors", path: "/doctors" },
  { name: "Appointments", path: "/appointments" },
  { name: "Consultation", path: "/consultation" },
];

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

function getProfileStorageKeys(role: TelemedicineRole | null) {
  if (role === "patient") {
    return {
      nameKey: PATIENT_PROFILE_NAME_KEY,
      imageKey: PATIENT_PROFILE_IMAGE_KEY,
    };
  }

  if (role === "doctor") {
    return {
      nameKey: DOCTOR_PROFILE_NAME_KEY,
      imageKey: DOCTOR_PROFILE_IMAGE_KEY,
    };
  }

  return null;
}

function getStoredProfileName(role: TelemedicineRole | null, fallback = "") {
  const keys = getProfileStorageKeys(role);
  return (keys ? localStorage.getItem(keys.nameKey) || "" : "") || fallback;
}

function getStoredProfileImage(role: TelemedicineRole | null) {
  const keys = getProfileStorageKeys(role);
  return keys ? localStorage.getItem(keys.imageKey) || "" : "";
}

function clearStoredProfiles() {
  localStorage.removeItem(PATIENT_PROFILE_NAME_KEY);
  localStorage.removeItem(PATIENT_PROFILE_IMAGE_KEY);
  localStorage.removeItem(DOCTOR_PROFILE_NAME_KEY);
  localStorage.removeItem(DOCTOR_PROFILE_IMAGE_KEY);
}

function isConsultationPath(pathname: string) {
  return (
    pathname === "/consultation" ||
    pathname.startsWith("/consultation/") ||
    pathname.startsWith("/doctor-sessions") ||
    pathname.startsWith("/patient-sessions") ||
    pathname.startsWith("/waiting-room/") ||
    pathname.startsWith("/session-summary/") ||
    pathname.startsWith("/session-history") ||
    pathname.startsWith("/telemedicine-dashboard") ||
    pathname.startsWith("/telemedicine-statistics")
  );
}

function isNavItemActive(pathname: string, linkPath: string, isActive: boolean) {
  if (linkPath === "/consultation") {
    return isConsultationPath(pathname);
  }

  return isActive;
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);
  const [actionError, setActionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = getStoredTelemedicineAuth();
  const [profileName, setProfileName] = useState(() =>
    getStoredProfileName(auth.role, auth.username || "")
  );
  const [profileImage, setProfileImage] = useState(() =>
    getStoredProfileImage(auth.role)
  );

  const initials = getInitials(profileName, auth.email ?? undefined);

  useEffect(() => {
    setProfileName(getStoredProfileName(auth.role, auth.username || ""));
    setProfileImage(getStoredProfileImage(auth.role));
  }, [auth.role, auth.username]);

  useEffect(() => {
    let isActive = true;
    const profileKeys = getProfileStorageKeys(auth.role);

    async function loadNavbarProfile() {
      if (!auth.isAuthenticated || !auth.token || !profileKeys) {
        setProfileName(auth.username || "");
        setProfileImage("");
        clearStoredProfiles();
        return;
      }

      try {
        if (auth.role === "patient") {
          const patient = await getCurrentPatientProfile(auth.token);

          if (!isActive) {
            return;
          }

          const fullName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();

          if (fullName) {
            localStorage.setItem(profileKeys.nameKey, fullName);
          } else {
            localStorage.removeItem(profileKeys.nameKey);
          }

          localStorage.setItem(profileKeys.imageKey, patient.profileImage || "");
          setProfileName(fullName || auth.username || "");
          setProfileImage(patient.profileImage || "");
          return;
        }

        const doctor = await getCurrentDoctorProfile(auth.token);

        if (!isActive) {
          return;
        }

        const fullName = doctor.fullName?.trim() || "";

        if (fullName) {
          localStorage.setItem(profileKeys.nameKey, fullName);
        } else {
          localStorage.removeItem(profileKeys.nameKey);
        }

        localStorage.setItem(profileKeys.imageKey, doctor.profileImage || "");
        setProfileName(fullName || auth.username || "");
        setProfileImage(doctor.profileImage || "");
      } catch {
        if (isActive) {
          localStorage.removeItem(profileKeys.nameKey);
          localStorage.removeItem(profileKeys.imageKey);
          setProfileName(auth.username || "");
          setProfileImage("");
        }
      }
    }

    loadNavbarProfile();

    return () => {
      isActive = false;
    };
  }, [auth.isAuthenticated, auth.role, auth.token, auth.username]);

  useEffect(() => {
    function syncProfileFromStorage() {
      setProfileName(getStoredProfileName(auth.role, auth.username || ""));
      setProfileImage(getStoredProfileImage(auth.role));
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, syncProfileFromStorage);

    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncProfileFromStorage);
    };
  }, [auth.role, auth.username]);

  async function handleLogout() {
    setActionError("");
    setIsSubmitting(true);

    try {
      if (auth.token) {
        await logoutUser(auth.token);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to log out cleanly.";
      setActionError(message);
      showToast(message, "error");
    } finally {
      clearStoredProfiles();
      clearTelemedicineAuth();
      showToast("Logged out successfully.", "success");
      setShowLogoutPrompt(false);
      setIsSubmitting(false);
      setIsOpen(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-blue-200/40 bg-white/80 backdrop-blur-md shadow-sm">
      {showLogoutPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-blue-200 bg-white p-8 shadow-2xl">
            <h2 className="text-center text-xl font-semibold text-slate-900">
              Confirm Logout
            </h2>
            <p className="mt-3 text-center text-sm leading-6 text-slate-600">
              Are you sure you want to log out of your account?
            </p>

            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowLogoutPrompt(false)}
                disabled={isSubmitting}
                className="min-w-[140px] rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-70"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isSubmitting}
                className="min-w-[140px] rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
              >
                {isSubmitting ? "Logging out..." : "Yes, Logout"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              className={({ isActive }) => {
                const active = isNavItemActive(location.pathname, link.path, isActive);

                return (
                `group relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  active
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                }`
                );
              }}
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
                to={getPostLoginPath(auth.role)}
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
                    {profileName || "My Profile"}
                  </p>
                  <p className="text-xs text-slate-500">View profile</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setShowLogoutPrompt(true)}
                disabled={isSubmitting}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:opacity-70"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/register"
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
              className={({ isActive }) => {
                const active = isNavItemActive(location.pathname, link.path, isActive);

                return (
                `rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  active
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                }`
                );
              }}
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
                to={getPostLoginPath(auth.role)}

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
                    {profileName || "My Profile"}
                  </p>
                  <p className="text-xs text-slate-500">Open profile</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setShowLogoutPrompt(true)}
                disabled={isSubmitting}
                className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-all duration-300 hover:bg-blue-700 disabled:opacity-70"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Link
                to="/register"
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
