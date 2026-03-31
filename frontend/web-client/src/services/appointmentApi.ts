import { APPOINTMENT_API_URL } from "../config/api";

export type AppointmentDoctor = {
  _id: string;
  fullName: string;
  specialization: string;
  city?: string;
  hospitalName?: string;
  consultationFee?: number;
  isAvailableForVideo?: boolean;
};

export type AppointmentRecord = {
  _id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentStatus?: string;
  createdAt?: string;
  updatedAt?: string;
};

type SpecialtiesResponse = {
  source: string;
  data: string[];
};

async function handleResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  if (data === null) {
    throw new Error("Empty response received from appointment service");
  }

  return data;
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(
      "Unable to connect to the appointment service. Please check that it is running."
    );
  }
}

export async function getAppointmentSpecialties(): Promise<string[]> {
  const response = await safeFetch(`${APPOINTMENT_API_URL}/specialties`);
  const data = await handleResponse<SpecialtiesResponse>(response);
  return data.data;
}

export async function searchDoctorsBySpecialty(
  specialization: string,
  city?: string
): Promise<AppointmentDoctor[]> {
  const params = new URLSearchParams({ specialization });
  if (city?.trim()) {
    params.set("city", city.trim());
  }

  const response = await safeFetch(
    `${APPOINTMENT_API_URL}/doctors/search?${params.toString()}`
  );
  return handleResponse<AppointmentDoctor[]>(response);
}

export async function createAppointment(
  token: string,
  payload: {
    patientId: string;
    doctorId: string;
    doctorName: string;
    specialization: string;
    appointmentDate: string;
    appointmentTime: string;
    reason: string;
    paymentStatus?: string;
  }
): Promise<AppointmentRecord> {
  const response = await safeFetch(APPOINTMENT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<{
    message: string;
    appointment: AppointmentRecord;
  }>(response);

  return data.appointment;
}

export async function getMyAppointments(
  token: string,
  status?: string
): Promise<AppointmentRecord[]> {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }

  const url = params.size
    ? `${APPOINTMENT_API_URL}?${params.toString()}`
    : APPOINTMENT_API_URL;

  const response = await safeFetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<AppointmentRecord[]>(response);
}

export async function cancelAppointment(
  token: string,
  appointmentId: string
): Promise<AppointmentRecord> {
  const response = await safeFetch(
    `${APPOINTMENT_API_URL}/${appointmentId}/cancel`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await handleResponse<{
    message: string;
    appointment: AppointmentRecord;
  }>(response);

  return data.appointment;
}

export async function deleteAppointment(
  token: string,
  appointmentId: string
): Promise<void> {
  const response = await safeFetch(`${APPOINTMENT_API_URL}/${appointmentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  await handleResponse<{ message: string }>(response);
}

export async function getDoctorAppointments(
  token: string,
  doctorAuthUserId: string
): Promise<AppointmentRecord[]> {
  const response = await safeFetch(
    `${APPOINTMENT_API_URL}/doctor/${doctorAuthUserId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleResponse<AppointmentRecord[]>(response);
}

export async function updateAppointmentStatus(
  token: string,
  appointmentId: string,
  status: "confirmed" | "completed" | "cancelled",
  note: string
): Promise<AppointmentRecord> {
  const response = await safeFetch(
    `${APPOINTMENT_API_URL}/${appointmentId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, note }),
    }
  );

  const data = await handleResponse<{
    message: string;
    appointment: AppointmentRecord;
  }>(response);

  return data.appointment;
}
