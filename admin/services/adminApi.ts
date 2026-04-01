import type { AdminDashboardStats } from "../types/admin";
import {
  AUTH_API_URL,
  DOCTOR_API_URL,
  TELEMEDICINE_API_URL,
  TELEMEDICINE_FILES_API_URL,
  TELEMEDICINE_PRESCRIPTIONS_API_URL,
} from "../src/config/api";

const AUTH_STORAGE_KEY = "admin_auth";

type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";

type TelemedicineSession = {
  appointmentId: string;
  status: SessionStatus;
};

type AuthStatsResponse = {
  doctorCount: number;
  patientCount: number;
  totalUsers: number;
  adminCount: number;
  message?: string;
};

export type DoctorVerificationStatus = "pending" | "approved" | "rejected";

export type DoctorVerification = {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  qualification: string;
  experience: number;
  licenseNumber: string;
  consultationFee?: number;
  hospitalName?: string;
  city?: string;
  about?: string;
  verificationStatus: DoctorVerificationStatus;
  verificationNote?: string;
  status: "active" | "inactive";
  createdAt: string;
  verifiedAt?: string | null;
};

type AppointmentResourceResponse<T> = {
  success: boolean;
  data?: T[];
  message?: string;
  error?: string;
};

function getStoredAuthToken() {
  const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedAuth) {
    return null;
  }

  try {
    const parsedAuth = JSON.parse(storedAuth) as { token?: string };
    return parsedAuth.token ?? null;
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string) {
  const headers = new Headers();
  const token = getStoredAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { headers });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

async function fetchJsonWithMethod<T>(
  url: string,
  options: RequestInit = {}
) {
  const headers = new Headers(options.headers || {});
  const token = getStoredAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

function countSessionsByStatus(
  sessions: TelemedicineSession[],
  status: SessionStatus
) {
  return sessions.filter((session) => session.status === status).length;
}

async function countResourcesByAppointmentIds(
  appointmentIds: string[],
  resourceBaseUrl: string
) {
  if (appointmentIds.length === 0) {
    return 0;
  }

  const results = await Promise.all(
    appointmentIds.map(async (appointmentId) => {
      const response = await fetchJson<AppointmentResourceResponse<unknown>>(
        `${resourceBaseUrl}/${appointmentId}`
      );

      return Array.isArray(response.data) ? response.data.length : 0;
    })
  );

  return results.reduce((total, count) => total + count, 0);
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [userStats, sessions] = await Promise.all([
    fetchJson<AuthStatsResponse>(`${AUTH_API_URL}/stats`),
    fetchJson<TelemedicineSession[]>(TELEMEDICINE_API_URL),
  ]);

  const appointmentIds = [
    ...new Set(
      sessions
        .map((session) => session.appointmentId)
        .filter((appointmentId) => appointmentId)
    ),
  ];

  const [totalFiles, totalPrescriptions] = await Promise.all([
    countResourcesByAppointmentIds(appointmentIds, TELEMEDICINE_FILES_API_URL),
    countResourcesByAppointmentIds(
      appointmentIds,
      TELEMEDICINE_PRESCRIPTIONS_API_URL
    ),
  ]);

  return {
    totalSessions: sessions.length,
    scheduledSessions: countSessionsByStatus(sessions, "scheduled"),
    activeSessions: countSessionsByStatus(sessions, "active"),
    completedSessions: countSessionsByStatus(sessions, "completed"),
    cancelledSessions: countSessionsByStatus(sessions, "cancelled"),
    totalPrescriptions,
    totalFiles,
    totalDoctors: userStats.doctorCount,
    totalPatients: userStats.patientCount,
  };
}

export async function getDoctorVerifications(
  verificationStatus?: DoctorVerificationStatus | "all"
) {
  const query =
    verificationStatus && verificationStatus !== "all"
      ? `?verificationStatus=${verificationStatus}`
      : "";

  return fetchJson<DoctorVerification[]>(
    `${DOCTOR_API_URL}/admin/verifications${query}`
  );
}

export async function updateDoctorVerification(
  doctorId: string,
  payload: {
    verificationStatus: Exclude<DoctorVerificationStatus, "pending">;
    verificationNote?: string;
  }
) {
  return fetchJsonWithMethod<{ message: string; doctor: DoctorVerification }>(
    `${DOCTOR_API_URL}/${doctorId}/verification`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}
