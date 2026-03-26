import type { TelemedicineSession } from "../services/telemedicineApi";

export type TelemedicineRole = "doctor" | "patient" | "admin";
export type TelemedicineActorRole = Exclude<TelemedicineRole, "admin">;
export const TELEMEDICINE_AUTH_STORAGE_KEY = "telemedicine_auth";

export type TelemedicineAuthState = {
  token: string | null;
  userId: string | null;
  role: TelemedicineRole | null;
  actorRole: TelemedicineActorRole | null;
  username: string | null;
  email: string | null;
  isAuthenticated: boolean;
};

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
      username: auth.username,
      email: auth.email,
      role: normalizedRole,
    })
  );
}

export function clearTelemedicineAuth() {
  window.localStorage.removeItem(TELEMEDICINE_AUTH_STORAGE_KEY);
}

export function getStoredTelemedicineAuth(): TelemedicineAuthState {
  if (typeof window === "undefined") {
    return {
      token: null,
      userId: null,
      role: null,
      actorRole: null,
      username: null,
      email: null,
      isAuthenticated: false,
    };
  }

  const rawValue = window.localStorage.getItem(TELEMEDICINE_AUTH_STORAGE_KEY);

  if (!rawValue) {
    return {
      token: null,
      userId: null,
      role: null,
      actorRole: null,
      username: null,
      email: null,
      isAuthenticated: false,
    };
  }

  let parsedValue: Record<string, unknown>;

  try {
    parsedValue = JSON.parse(rawValue) as Record<string, unknown>;
  } catch {
    clearTelemedicineAuth();

    return {
      token: null,
      userId: null,
      role: null,
      actorRole: null,
      username: null,
      email: null,
      isAuthenticated: false,
    };
  }

  const token = normalizeString(parsedValue.token);
  const userId = normalizeString(parsedValue.userId);
  const role = normalizeTelemedicineRole(parsedValue.role);
  const username = normalizeString(parsedValue.username);
  const email = normalizeString(parsedValue.email);

  return {
    token,
    userId,
    role,
    actorRole: role === "doctor" || role === "patient" ? role : null,
    username,
    email,
    isAuthenticated: Boolean(token || role || userId),
  };
}

export function getRoleHomePath(role: TelemedicineRole | null): string {
  if (role === "doctor") {
    return "/doctor-sessions";
  }

  if (role === "patient") {
    return "/patient-sessions";
  }

  return "/";
}

export function canAccessTelemedicineSession(
  auth: TelemedicineAuthState,
  session: TelemedicineSession
): boolean {
  if (!auth.actorRole || !auth.userId) {
    return false;
  }

  if (auth.actorRole === "doctor") {
    return auth.userId === session.doctorId;
  }

  return auth.userId === session.patientId;
}
