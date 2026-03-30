import { TELEMEDICINE_API_URL } from "../config/api";

export type TelemedicineStatus =
  | "scheduled"
  | "active"
  | "completed"
  | "cancelled";

export type TelemedicineParticipantDetails = {
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  profileImage?: string;
};

export type TelemedicineAppointmentDetails = {
  id?: string;
  status?: string;
  date?: string;
  time?: string;
  reason?: string;
  symptoms?: string;
  consultationType?: string;
};

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

  // Enriched fields from backend
  doctorName?: string;
  doctorSpecialization?: string;
  patientName?: string;

  doctor?: TelemedicineParticipantDetails;
  patient?: TelemedicineParticipantDetails;
  appointment?: TelemedicineAppointmentDetails;
};

export type SessionResponse = {
  message: string;
  session: TelemedicineSession;
};

export type TelemedicineStatsResponse = {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  todaySessions: number;
};

function getStoredTelemedicineToken() {
  const rawAuth = localStorage.getItem("telemedicine_auth");

  if (!rawAuth) {
    return "";
  }

  try {
    const parsedAuth = JSON.parse(rawAuth);
    return typeof parsedAuth.token === "string" ? parsedAuth.token : "";
  } catch {
    return "";
  }
}

function getAuthHeaders() {
  const token = getStoredTelemedicineToken();

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Get all sessions
export async function getAllSessions(): Promise<TelemedicineSession[]> {
  const response = await fetch(TELEMEDICINE_API_URL, {
    headers: getAuthHeaders(),
  });

  return handleResponse<TelemedicineSession[]>(response);
}

export async function getTelemedicineStats(): Promise<TelemedicineStatsResponse> {
  const response = await fetch(`${TELEMEDICINE_API_URL}/stats`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<TelemedicineStatsResponse>(response);
}

// Get one session by MongoDB _id
export async function getSessionById(id: string): Promise<TelemedicineSession> {
  const response = await fetch(`${TELEMEDICINE_API_URL}/${id}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<TelemedicineSession>(response);
}

// Get session by appointmentId
export async function getSessionByAppointmentId(
  appointmentId: string
): Promise<TelemedicineSession> {
  const response = await fetch(
    `${TELEMEDICINE_API_URL}/appointment/${appointmentId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  return handleResponse<TelemedicineSession>(response);
}

// Get sessions by doctorId
export async function getSessionsByDoctorId(
  doctorId: string
): Promise<TelemedicineSession[]> {
  const response = await fetch(`${TELEMEDICINE_API_URL}/doctor/${doctorId}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<TelemedicineSession[]>(response);
}

// Get sessions by patientId
export async function getSessionsByPatientId(
  patientId: string
): Promise<TelemedicineSession[]> {
  const response = await fetch(`${TELEMEDICINE_API_URL}/patient/${patientId}`, {
    headers: getAuthHeaders(),
  });

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
  const response = await fetch(TELEMEDICINE_API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse<SessionResponse>(response);
}

// Update session status by appointmentId
export async function updateSessionStatus(
  appointmentId: string,
  status: TelemedicineStatus
): Promise<SessionResponse> {
  const response = await fetch(
    `${TELEMEDICINE_API_URL}/appointment/${appointmentId}/status`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    }
  );

  return handleResponse<SessionResponse>(response);
}

// Update session notes by appointmentId
export async function updateSessionNotes(
  appointmentId: string,
  notes: string
): Promise<SessionResponse> {
  const response = await fetch(
    `${TELEMEDICINE_API_URL}/appointment/${appointmentId}/notes`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes }),
    }
  );

  return handleResponse<SessionResponse>(response);
}

export type TelemedicineMessage = {
  _id: string;
  appointmentId: string;
  senderRole: "doctor" | "patient" | "system";
  senderName: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type MessagesResponse = {
  success: boolean;
  data: TelemedicineMessage[];
  message?: string;
};

export type MessageResponse = {
  success: boolean;
  data: TelemedicineMessage;
  message?: string;
};

export async function getMessagesByAppointmentId(
  appointmentId: string
): Promise<MessagesResponse> {
  const response = await fetch(
    `${TELEMEDICINE_API_URL}/chat/${appointmentId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function sendTelemedicineMessage(payload: {
  appointmentId: string;
  senderRole: "doctor" | "patient" | "system";
  senderName: string;
  message: string;
}): Promise<MessageResponse> {
  const response = await fetch(`${TELEMEDICINE_API_URL}/chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export type TelemedicineFile = {
  _id: string;
  appointmentId: string;
  originalName: string;
  fileName: string;
  filePath: string;
  uploadedByRole: "doctor" | "patient";
  createdAt: string;
  updatedAt: string;
};

export type FilesResponse = {
  success: boolean;
  data: TelemedicineFile[];
  message?: string;
};

export type FileResponse = {
  success: boolean;
  data: TelemedicineFile;
  message?: string;
};

export async function getFilesByAppointmentId(
  appointmentId: string
): Promise<FilesResponse> {
  const response = await fetch(
    `${TELEMEDICINE_API_URL}/files/${appointmentId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function uploadTelemedicineFile(payload: {
  appointmentId: string;
  uploadedByRole: "doctor" | "patient";
  file: File;
}): Promise<FileResponse> {
  const rawAuth = localStorage.getItem("telemedicine_auth");
  let token = "";

  try {
    const parsedAuth = rawAuth ? JSON.parse(rawAuth) : null;
    token = typeof parsedAuth?.token === "string" ? parsedAuth.token : "";
  } catch {
    token = "";
  }

  const formData = new FormData();
  formData.append("appointmentId", payload.appointmentId);
  formData.append("uploadedByRole", payload.uploadedByRole);
  formData.append("file", payload.file);

  const response = await fetch(`${TELEMEDICINE_API_URL}/files`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export type TelemedicinePrescription = {
  _id: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  medicineName: string;
  dosage: string;
  instructions: string;
  createdAt: string;
  updatedAt: string;
};

export type PrescriptionsResponse = {
  success: boolean;
  data: TelemedicinePrescription[];
  message?: string;
};

export type PrescriptionResponse = {
  success: boolean;
  data: TelemedicinePrescription;
  message?: string;
};

export async function getPrescriptionsByAppointmentId(
  appointmentId: string
): Promise<PrescriptionsResponse> {
  const response = await fetch(
    `${TELEMEDICINE_API_URL}/prescriptions/${appointmentId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function createPrescription(payload: {
  appointmentId: string;
  doctorId: string;
  patientId: string;
  medicineName: string;
  dosage: string;
  instructions: string;
}): Promise<PrescriptionResponse> {
  const response = await fetch(`${TELEMEDICINE_API_URL}/prescriptions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}