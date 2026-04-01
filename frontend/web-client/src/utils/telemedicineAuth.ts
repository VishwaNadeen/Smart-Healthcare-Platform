import type { TelemedicineSession } from "../services/telemedicineApi";

export type TelemedicineRole = "doctor" | "patient" | "admin";
export type TelemedicineActorRole = Exclude<TelemedicineRole, "admin">;

export const TELEMEDICINE_AUTH_STORAGE_KEY = "telemedicine_auth";

export type TelemedicineAuthState = {
  token: string | null;
  userId: string | null;
  doctorProfileId: string | null;
  role: TelemedicineRole | null;
  actorRole: TelemedicineActorRole | null;
  username: string | null;
  email: string | null;
  isAuthenticated: boolean;
};

function getEmptyTelemedicineAuthState(): TelemedicineAuthState {
  return {
    token: null,
    userId: null,
    doctorProfileId: null,
    role: null,
    actorRole: null,
    username: null,
    email: null,
    isAuthenticated: false,
  };
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeTelemedicineRole(
  value: unknown
): TelemedicineRole | null {
  const normalizedValue = normalizeString(value)?.toLowerCase();

  if (normalizedValue === "doctor" || normalizedValue === "admin") {
    return normalizedValue;
  }

  if (normalizedValue === "patient" || normalizedValue === "user") {
    return "patient";
  }

  return null;
}

export function saveTelemedicineAuth(auth: {
  token: string;
  id: string;
  username: string;
  email: string;
  role: string;
  doctorProfileId?: string | null;
}) {
  const normalizedRole = normalizeTelemedicineRole(auth.role);

  if (!normalizedRole) {
    throw new Error("Unsupported role returned from login");
  }

  window.localStorage.setItem(
    TELEMEDICINE_AUTH_STORAGE_KEY,
    JSON.stringify({
      token: auth.token,
      userId: auth.id,
      doctorProfileId: auth.doctorProfileId || null,
      username: auth.username,
      email: auth.email,
      role: normalizedRole,
    })
  );
}

export function clearTelemedicineAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TELEMEDICINE_AUTH_STORAGE_KEY);
}

function isSafeRedirectPath(pathname: string | null | undefined): pathname is string {
  if (!pathname || typeof pathname !== "string") {
    return false;
  }

  return (
    pathname.startsWith("/") &&
    pathname !== "/login" &&
    pathname !== "/register" &&
    pathname !== "/signup" &&
    pathname !== "/verify-email" &&
    pathname !== "/forgot-password"
  );
}

export function getStoredTelemedicineAuth(): TelemedicineAuthState {
  if (typeof window === "undefined") {
    return getEmptyTelemedicineAuthState();
  }

  const rawValue = window.localStorage.getItem(TELEMEDICINE_AUTH_STORAGE_KEY);

  if (!rawValue) {
    return getEmptyTelemedicineAuthState();
  }

  let parsedValue: Record<string, unknown>;

  try {
    parsedValue = JSON.parse(rawValue) as Record<string, unknown>;
  } catch {
    clearTelemedicineAuth();
    return getEmptyTelemedicineAuthState();
  }

  const token = normalizeString(parsedValue.token);
  const userId = normalizeString(parsedValue.userId);
  const doctorProfileId = normalizeString(parsedValue.doctorProfileId);
  const role = normalizeTelemedicineRole(parsedValue.role);
  const username = normalizeString(parsedValue.username);
  const email = normalizeString(parsedValue.email);

  return {
    token,
    userId,
    doctorProfileId,
    role,
    actorRole: role === "doctor" || role === "patient" ? role : null,
    username,
    email,
    isAuthenticated: Boolean(token && role && userId),
  };
}

export function getTelemedicineAuth(): TelemedicineAuthState {
  return getStoredTelemedicineAuth();
}

export function getRoleHomePath(role: TelemedicineRole | null): string {
  if (role === "doctor") {
    return "/doctor-sessions";
  }

  if (role === "patient") {
    return "/patient-sessions";
  }

  if (role === "admin") {
    return "/dashboard";
  }

  return "/";
}

export function getPostLoginPath(
  role: TelemedicineRole | null,
  fromPathname?: string | null
): string {
  if (isSafeRedirectPath(fromPathname)) {
    return fromPathname;
  }

  if (role === "patient") {
    return "/patient/profile";
  }

  return getRoleHomePath(role);
}

export function canAccessTelemedicineSession(
  auth: TelemedicineAuthState,
  session: TelemedicineSession
): boolean {
  if (!auth.actorRole || !auth.userId) {
    return false;
  }

  if (auth.actorRole === "doctor") {
    const sessionDoctorId = normalizeString(session.doctorId);
    const nestedDoctorId = normalizeString((session as any)?.doctor?.id);
    const nestedDoctorUserId = normalizeString((session as any)?.doctor?.userId);

    return (
      auth.userId === sessionDoctorId ||
      auth.userId === nestedDoctorId ||
      auth.userId === nestedDoctorUserId ||
      (auth.doctorProfileId !== null &&
        (auth.doctorProfileId === sessionDoctorId ||
          auth.doctorProfileId === nestedDoctorId ||
          auth.doctorProfileId === nestedDoctorUserId))
    );
  }

  const sessionPatientId = normalizeString(session.patientId);
  const nestedPatientId = normalizeString((session as any)?.patient?.id);
  const nestedPatientUserId = normalizeString((session as any)?.patient?.userId);

  return (
    auth.userId === sessionPatientId ||
    auth.userId === nestedPatientId ||
    auth.userId === nestedPatientUserId
  );
}