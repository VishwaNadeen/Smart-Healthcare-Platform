import { TELEMEDICINE_API_URL } from "../config/api";

export type TelemedicineSession = {
  _id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  roomName: string;
  meetingLink: string;
  scheduledDate: string;
  scheduledTime: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function getSessionByAppointmentId(
  appointmentId: string
): Promise<TelemedicineSession> {
  const response = await fetch(
    `${TELEMEDICINE_API_URL}/appointment/${appointmentId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch telemedicine session");
  }

  return response.json();
}

export async function getSessionsByDoctorId(
  doctorId: string
): Promise<TelemedicineSession[]> {
  const response = await fetch(`${TELEMEDICINE_API_URL}/doctor/${doctorId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch doctor sessions");
  }

  return response.json();
}

export async function getSessionsByPatientId(
  patientId: string
): Promise<TelemedicineSession[]> {
  const response = await fetch(`${TELEMEDICINE_API_URL}/patient/${patientId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch patient sessions");
  }

  return response.json();
}

export async function createSession(data: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledDate: string;
  scheduledTime: string;
}): Promise<{ message: string; session: TelemedicineSession }> {
  const response = await fetch(TELEMEDICINE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create session");
  }

  return response.json();
}

export function canJoinMeeting(
  scheduledDate: string,
  scheduledTime: string
): boolean {
  const meetingDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
  const now = new Date();

  const diffInMs = meetingDateTime.getTime() - now.getTime();
  const diffInMinutes = diffInMs / (1000 * 60);

  return diffInMinutes <= 10 && diffInMinutes >= -60;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString();
}