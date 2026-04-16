import type { AdminDashboardStats } from "../types/admin";
import {
  APPOINTMENT_API_URL,
  AUTH_API_URL,
  DOCTOR_API_URL,
  TELEMEDICINE_API_URL,
  TELEMEDICINE_FILES_API_URL,
  TELEMEDICINE_PRESCRIPTIONS_API_URL,
} from "../src/config/api";

const AUTH_STORAGE_KEY = "admin_auth";

type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";
type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";
type PaymentStatus = "pending" | "paid" | "failed";

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

type AppointmentResourceResponse<T> = {
  success: boolean;
  data?: T[];
  message?: string;
  error?: string;
};

type DoctorServiceDoctor = {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  experience?: number;
  qualification?: string;
  licenseNumber?: string;
  hospitalName?: string;
  hospitalAddress?: string;
  city?: string;
  availableDays?: string[];
  availableTimeSlots?: string[];
  consultationFee?: number;
  acceptsNewAppointments?: boolean;
  profileImage?: string;
  about?: string;
  availabilitySchedule?: Array<{
    day: string;
    startTime: string;
    endTime: string;
    mode?: "in_person" | "video" | "both";
    maxAppointments?: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
};

type AppointmentApiAppointment = {
  _id: string;
  doctorId: string;
  doctorName?: string;
  specialization?: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  paymentStatus?: PaymentStatus;
  reason?: string;
  createdAt?: string;
};

export type DoctorVerificationStatus =
  | "pending"
  | "in-review"
  | "approved"
  | "rejected";

export type DoctorReviewNote = {
  status: DoctorVerificationStatus;
  note: string;
  createdAt?: string;
  createdByName?: string;
  editableFields?: string[];
};

export type DoctorVerification = {
  _id: string;
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
  availableDays: string[];
  availableTimeSlots: string[];
  consultationFee?: number;
  acceptsNewAppointments?: boolean;
  profileImage?: string;
  about?: string;
  createdAt?: string;
  updatedAt?: string;
  isEmailVerified?: boolean;
  verificationStatus: DoctorVerificationStatus;
  verificationNote?: string;
  verifiedAt?: string;
  editableFields?: string[];
  reviewNotes: DoctorReviewNote[];
  availabilitySchedule: Array<{
    day: string;
    startTime: string;
    endTime: string;
    mode?: "in_person" | "video" | "both";
    maxAppointments?: number;
  }>;
};

export type AdminAnalyticsAppointment = {
  _id: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  paymentStatus?: PaymentStatus;
  reason?: string;
  createdAt?: string;
};

export type AdminAppointmentActivity = {
  totalAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
};

type DoctorUpdatePayload = {
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

type DoctorVerificationPayload = {
  verificationStatus: DoctorVerificationStatus;
  verificationNote?: string;
  editableFields?: string[];
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

async function fetchJson<T>(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = getStoredAuthToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
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

function normalizeDoctorVerificationStatus(
  doctor: DoctorServiceDoctor
): DoctorVerificationStatus {
  return doctor.status === "active" ? "approved" : "pending";
}

function mapDoctorToVerification(
  doctor: DoctorServiceDoctor
): DoctorVerification {
  return {
    _id: doctor._id,
    fullName: doctor.fullName || "",
    email: doctor.email || "",
    phone: doctor.phone || "",
    specialization: doctor.specialization || "",
    experience: Number(doctor.experience) || 0,
    qualification: doctor.qualification || "",
    licenseNumber: doctor.licenseNumber || "",
    hospitalName: doctor.hospitalName || "",
    hospitalAddress: doctor.hospitalAddress || "",
    city: doctor.city || "",
    availableDays: Array.isArray(doctor.availableDays) ? doctor.availableDays : [],
    availableTimeSlots: Array.isArray(doctor.availableTimeSlots)
      ? doctor.availableTimeSlots
      : [],
    consultationFee: Number(doctor.consultationFee) || 0,
    acceptsNewAppointments: doctor.acceptsNewAppointments !== false,
    profileImage: doctor.profileImage || "",
    about: doctor.about || "",
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
    isEmailVerified: undefined,
    verificationStatus: normalizeDoctorVerificationStatus(doctor),
    verificationNote: "",
    verifiedAt: doctor.updatedAt || doctor.createdAt,
    editableFields: [],
    reviewNotes: [],
    availabilitySchedule: Array.isArray(doctor.availabilitySchedule)
      ? doctor.availabilitySchedule
      : [],
  };
}

function mapAppointmentRow(
  appointment: AppointmentApiAppointment
): AdminAnalyticsAppointment {
  return {
    _id: appointment._id,
    doctorId: appointment.doctorId,
    doctorName: appointment.doctorName || "Doctor",
    specialization: appointment.specialization || "General",
    appointmentDate: appointment.appointmentDate,
    appointmentTime: appointment.appointmentTime,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus || "pending",
    reason: appointment.reason || "",
    createdAt: appointment.createdAt,
  };
}

async function tryFetchAppointmentsAnalytics() {
  const candidateUrls = [
    `${APPOINTMENT_API_URL}/admin/analytics`,
    `${APPOINTMENT_API_URL}/admin/appointments`,
  ];

  for (const url of candidateUrls) {
    try {
      const data = await fetchJson<AppointmentApiAppointment[] | { data?: AppointmentApiAppointment[] }>(
        url
      );

      if (Array.isArray(data)) {
        return data;
      }

      if (Array.isArray(data?.data)) {
        return data.data;
      }
    } catch {
      // Try the next known shape. The current backend may not expose
      // admin appointment analytics yet.
    }
  }

  return [];
}

function unsupportedAdminDoctorAction(): never {
  throw new Error(
    "This backend does not currently support admin doctor edit, review, or delete actions."
  );
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
  status: DoctorVerificationStatus | "all" = "all"
): Promise<DoctorVerification[]> {
  const doctors = await fetchJson<DoctorServiceDoctor[]>(DOCTOR_API_URL);
  const mapped = doctors.map(mapDoctorToVerification);

  if (status === "all") {
    return mapped;
  }

  return mapped.filter((doctor) => doctor.verificationStatus === status);
}

export async function getDoctorDetails(
  doctorId: string
): Promise<DoctorVerification> {
  const doctor = await fetchJson<DoctorServiceDoctor>(`${DOCTOR_API_URL}/${doctorId}`);
  return mapDoctorToVerification(doctor);
}

export async function updateDoctorDetails(
  _doctorId: string,
  _payload: DoctorUpdatePayload
): Promise<DoctorVerification> {
  unsupportedAdminDoctorAction();
}

export async function updateDoctorVerification(
  _doctorId: string,
  _payload: DoctorVerificationPayload
): Promise<{ doctor: DoctorVerification }> {
  unsupportedAdminDoctorAction();
}

export async function deleteDoctor(_doctorId: string): Promise<{ message: string }> {
  unsupportedAdminDoctorAction();
}

export async function getAdminAppointmentsAnalytics(): Promise<
  AdminAnalyticsAppointment[]
> {
  const appointments = await tryFetchAppointmentsAnalytics();
  return appointments.map(mapAppointmentRow);
}

export async function getAdminAppointmentActivity(): Promise<AdminAppointmentActivity> {
  const appointments = await getAdminAppointmentsAnalytics();

  return {
    totalAppointments: appointments.length,
    pendingAppointments: appointments.filter(
      (appointment) => appointment.status === "pending"
    ).length,
    confirmedAppointments: appointments.filter(
      (appointment) => appointment.status === "confirmed"
    ).length,
    completedAppointments: appointments.filter(
      (appointment) => appointment.status === "completed"
    ).length,
    cancelledAppointments: appointments.filter(
      (appointment) => appointment.status === "cancelled"
    ).length,
  };
}
