import type { AdminDashboardStats } from "../types/admin";
import {
  AUTH_API_URL,
  APPOINTMENT_API_URL,
  DOCTOR_API_URL,
  DOCTOR_SPECIALTY_API_URL,
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

export type DoctorVerificationStatus =
  | "pending"
  | "in-review"
  | "approved"
  | "rejected";

export type DoctorReviewNote = {
  note: string;
  status: DoctorVerificationStatus;
  createdAt?: string;
  createdByName?: string;
  createdByEmail?: string;
  editableFields?: string[];
};

export type DoctorVerification = {
  _id: string;
  authUserId: string;
  fullName: string;
  email: string;
  isEmailVerified?: boolean;
  phone: string;
  specialization: string;
  specializationId?: string;
  qualification: string;
  experience: number;
  licenseNumber: string;
  consultationFee?: number;
  hospitalName?: string;
  hospitalAddress?: string;
  city?: string;
  availableDays?: string[];
  availableTimeSlots?: string[];
  availabilitySchedule?: Array<{
    day: string;
    startTime: string;
    endTime: string;
    mode?: string;
    maxAppointments?: number;
  }>;
  profileImage?: string;
  profileImagePublicId?: string;
  about?: string;
  acceptsNewAppointments?: boolean;
  verificationStatus: DoctorVerificationStatus;
  verificationNote?: string;
  reviewNotes?: DoctorReviewNote[];
  editableFields?: string[];
  createdAt: string;
  verifiedAt?: string | null;
};

export type DoctorUpdatePayload = {
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  experience: number;
  qualification: string;
  licenseNumber: string;
  hospitalName?: string;
  hospitalAddress?: string;
  city?: string;
  consultationFee?: number;
  about?: string;
  acceptsNewAppointments?: boolean;
};

export type DoctorSpecialty = {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type DoctorSpecialtyPayload = {
  name: string;
  description?: string;
  isActive?: boolean;
};

export type AdminAnalyticsAppointment = {
  _id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentStatus?: "pending" | "paid" | "failed";
  createdAt?: string;
};

export type AdminAppointmentActivity = {
  totalAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
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

export async function getDoctorDetails(doctorId: string) {
  return fetchJson<DoctorVerification>(`${DOCTOR_API_URL}/${doctorId}`);
}

export async function updateDoctorDetails(
  doctorId: string,
  payload: DoctorUpdatePayload
) {
  return fetchJsonWithMethod<DoctorVerification>(`${DOCTOR_API_URL}/${doctorId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteDoctor(doctorId: string) {
  return fetchJsonWithMethod<{ message: string }>(`${DOCTOR_API_URL}/${doctorId}`, {
    method: "DELETE",
  });
}

export async function updateDoctorVerification(
  doctorId: string,
  payload: {
    verificationStatus: DoctorVerificationStatus;
    verificationNote?: string;
    editableFields?: string[];
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

export async function getDoctorSpecialties() {
  return fetchJson<DoctorSpecialty[]>(DOCTOR_SPECIALTY_API_URL);
}

export async function createDoctorSpecialty(payload: DoctorSpecialtyPayload) {
  return fetchJsonWithMethod<DoctorSpecialty>(DOCTOR_SPECIALTY_API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDoctorSpecialty(
  specialtyId: string,
  payload: DoctorSpecialtyPayload
) {
  return fetchJsonWithMethod<DoctorSpecialty>(
    `${DOCTOR_SPECIALTY_API_URL}/${specialtyId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteDoctorSpecialty(specialtyId: string) {
  return fetchJsonWithMethod<{ message: string; doctorsUsingSpecialty?: number }>(
    `${DOCTOR_SPECIALTY_API_URL}/${specialtyId}`,
    {
      method: "DELETE",
    }
  );
}

export async function getAdminAppointmentsAnalytics() {
  return fetchJson<AdminAnalyticsAppointment[]>(`${APPOINTMENT_API_URL}/admin/all`);
}

export async function getAdminAppointmentActivity() {
  return fetchJson<AdminAppointmentActivity>(`${APPOINTMENT_API_URL}/admin/activity`);
}

