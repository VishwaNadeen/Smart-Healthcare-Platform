import { APPOINTMENT_API_URL } from "../config/api";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed";

export type AppointmentStatusHistoryItem = {
  status: AppointmentStatus;
  updatedAt: string;
  note?: string;
};

export type Appointment = {
  _id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  statusHistory?: AppointmentStatusHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateAppointmentPayload = {
  doctorId: string;
  doctorName: string;
  specialization: string;
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
  paymentStatus?: PaymentStatus;
};

async function handleAppointmentResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { message?: string; error?: string })
    | null;

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  if (data === null) {
    throw new Error("Empty response received from appointment service");
  }

  return data as T;
}

export async function getPatientAppointments(
  token: string
): Promise<Appointment[]> {
  let response: Response;

  try {
    response = await fetch(APPOINTMENT_API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the appointment service. Please check that it is running."
    );
  }

  return handleAppointmentResponse<Appointment[]>(response);
}

export async function createAppointment(
  token: string,
  payload: CreateAppointmentPayload
): Promise<{ message: string; appointment: Appointment }> {
  let response: Response;

  try {
    response = await fetch(APPOINTMENT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Unable to connect to the appointment service. Please check that it is running."
    );
  }

  return handleAppointmentResponse<{ message: string; appointment: Appointment }>(
    response
  );
}

export async function getDoctorAppointments(
  token: string,
  doctorId: string
): Promise<Appointment[]> {
  let response: Response;

  try {
    response = await fetch(`${APPOINTMENT_API_URL}/doctor/${doctorId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the appointment service. Please check that it is running."
    );
  }

  return handleAppointmentResponse<Appointment[]>(response);
}

export async function updateDoctorAppointmentStatus(
  token: string,
  appointmentId: string,
  status: Extract<AppointmentStatus, "confirmed" | "completed" | "cancelled">,
  note?: string
): Promise<{ message: string; appointment?: Appointment }> {
  let response: Response;

  try {
    response = await fetch(`${APPOINTMENT_API_URL}/${appointmentId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status,
        ...(note ? { note } : {}),
      }),
    });
  } catch {
    throw new Error(
      "Unable to connect to the appointment service. Please check that it is running."
    );
  }

  return handleAppointmentResponse<{ message: string; appointment?: Appointment }>(
    response
  );
}

export async function cancelAppointment(
  token: string,
  appointmentId: string
): Promise<{ message: string; appointment?: Appointment }> {
  let response: Response;

  try {
    response = await fetch(`${APPOINTMENT_API_URL}/${appointmentId}/cancel`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the appointment service. Please check that it is running."
    );
  }

  return handleAppointmentResponse<{ message: string; appointment?: Appointment }>(
    response
  );
}
