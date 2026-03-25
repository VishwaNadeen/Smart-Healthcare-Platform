const TELEMEDICINE_API = "http://localhost:5007/api/telemedicine";

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
    `${TELEMEDICINE_API}/appointment/${appointmentId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch telemedicine session");
  }

  return response.json();
}

export async function getSessionsByDoctorId(
  doctorId: string
): Promise<TelemedicineSession[]> {
  const response = await fetch(`${TELEMEDICINE_API}/doctor/${doctorId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch doctor sessions");
  }

  return response.json();
}

export async function getSessionsByPatientId(
  patientId: string
): Promise<TelemedicineSession[]> {
  const response = await fetch(`${TELEMEDICINE_API}/patient/${patientId}`);

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
  const response = await fetch(TELEMEDICINE_API, {
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