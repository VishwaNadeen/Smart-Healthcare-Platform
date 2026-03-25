const TELEMEDICINE_API = "http://localhost:5007/api/telemedicine";

export type TelemedicineStatus =
  | "scheduled"
  | "active"
  | "completed"
  | "cancelled";

export type TelemedicineSession = {
  _id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  roomName: string;
  meetingLink: string;
  scheduledDate: string;
  scheduledTime: string;
  status: TelemedicineStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SessionResponse = {
  message: string;
  session: TelemedicineSession;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Get all sessions
export async function getAllSessions(): Promise<TelemedicineSession[]> {
  const response = await fetch(TELEMEDICINE_API);
  return handleResponse<TelemedicineSession[]>(response);
}

// Get one session by MongoDB _id
export async function getSessionById(id: string): Promise<TelemedicineSession> {
  const response = await fetch(`${TELEMEDICINE_API}/${id}`);
  return handleResponse<TelemedicineSession>(response);
}

// Get session by appointmentId
export async function getSessionByAppointmentId(
  appointmentId: string
): Promise<TelemedicineSession> {
  const response = await fetch(
    `${TELEMEDICINE_API}/appointment/${appointmentId}`
  );
  return handleResponse<TelemedicineSession>(response);
}

// Get sessions by doctorId
export async function getSessionsByDoctorId(
  doctorId: string
): Promise<TelemedicineSession[]> {
  const response = await fetch(`${TELEMEDICINE_API}/doctor/${doctorId}`);
  return handleResponse<TelemedicineSession[]>(response);
}

// Get sessions by patientId
export async function getSessionsByPatientId(
  patientId: string
): Promise<TelemedicineSession[]> {
  const response = await fetch(`${TELEMEDICINE_API}/patient/${patientId}`);
  return handleResponse<TelemedicineSession[]>(response);
}

// Create new session
export async function createSession(data: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledDate: string;
  scheduledTime: string;
}): Promise<SessionResponse> {
  const response = await fetch(TELEMEDICINE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return handleResponse<SessionResponse>(response);
}

// Update session status by MongoDB _id
export async function updateSessionStatus(
  sessionId: string,
  status: TelemedicineStatus
): Promise<SessionResponse> {
  const response = await fetch(`${TELEMEDICINE_API}/${sessionId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  return handleResponse<SessionResponse>(response);
}

// Update session notes by MongoDB _id
export async function updateSessionNotes(
  sessionId: string,
  notes: string
): Promise<SessionResponse> {
  const response = await fetch(`${TELEMEDICINE_API}/${sessionId}/notes`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notes }),
  });

  return handleResponse<SessionResponse>(response);
}
