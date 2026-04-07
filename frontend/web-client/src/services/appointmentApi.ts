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

export type AppointmentDoctor = {
  _id: string;
  fullName: string;
  specialization: string;
  city?: string;
  hospitalName?: string;
  consultationFee?: number;
  isAvailableForVideo?: boolean;
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
  paymentStatus?: PaymentStatus;
  statusHistory: AppointmentStatusHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type AppointmentRecord = Appointment;

export type AppointmentAvailabilitySlot = {
  time: string;
  label: string;
};

export type DoctorAvailableSlotsResponse = {
  doctorId: string;
  appointmentDate: string;
  appointmentDurationMinutes: number;
  availableWeekdays: string[];
  availableSlots: AppointmentAvailabilitySlot[];
};

export type AppointmentTrackingResponse = {
  appointmentId: string;
  status: AppointmentStatus;
  paymentStatus?: PaymentStatus;
  updatedAt?: string;
  statusHistory: AppointmentStatusHistoryItem[];
};

export type AdminAppointmentActivityResponse = {
  totalAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
};

type SpecialtiesResponse = {
  source: string;
  data: string[];
};

export type CreateAppointmentPayload = {
  patientId?: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
  paymentStatus?: PaymentStatus;
};

type AppointmentMutationResponse = {
  message: string;
  appointment?: Appointment;
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

async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(
      "Unable to connect to the appointment service. Please check that it is running."
    );
  }
}

function withFallbackAppointment(
  response: AppointmentMutationResponse,
  fallback: Appointment
): Appointment & { message: string; appointment: Appointment } {
  const appointment = response.appointment ?? fallback;

  return {
    ...appointment,
    message: response.message,
    appointment,
  };
}

export async function getPatientAppointments(
  token: string
): Promise<Appointment[]> {
  const response = await safeFetch(APPOINTMENT_API_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleAppointmentResponse<Appointment[]>(response);
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
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleAppointmentResponse<AppointmentRecord[]>(response);
}

export async function getAppointmentSpecialties(): Promise<string[]> {
  const response = await safeFetch(`${APPOINTMENT_API_URL}/specialties`);
  const data = await handleAppointmentResponse<SpecialtiesResponse>(response);
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

  return handleAppointmentResponse<AppointmentDoctor[]>(response);
}

export async function createAppointment(
  token: string,
  payload: CreateAppointmentPayload
): Promise<Appointment & { message: string; appointment: Appointment }> {
  const response = await safeFetch(APPOINTMENT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await handleAppointmentResponse<{
    message: string;
    appointment: Appointment;
  }>(response);

  return {
    ...data.appointment,
    message: data.message,
    appointment: data.appointment,
  };
}

export async function getDoctorAvailableSlots(
  token: string,
  params: {
    doctorId: string;
    appointmentDate: string;
  }
): Promise<DoctorAvailableSlotsResponse> {
  const searchParams = new URLSearchParams({
    doctorId: params.doctorId,
    appointmentDate: params.appointmentDate,
  });

  const response = await safeFetch(
    `${APPOINTMENT_API_URL}/availability/slots?${searchParams.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleAppointmentResponse<DoctorAvailableSlotsResponse>(response);
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

  await handleAppointmentResponse<{ message: string }>(response);
}

export async function getDoctorAppointments(
  token: string,
  doctorId: string
): Promise<Appointment[]> {
  const response = await safeFetch(`${APPOINTMENT_API_URL}/doctor/${doctorId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleAppointmentResponse<Appointment[]>(response);
}

export async function getAdminAppointments(token: string): Promise<Appointment[]> {
  const response = await safeFetch(`${APPOINTMENT_API_URL}/admin/all`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleAppointmentResponse<Appointment[]>(response);
}

export async function getAdminAppointmentActivity(
  token: string
): Promise<AdminAppointmentActivityResponse> {
  const response = await safeFetch(`${APPOINTMENT_API_URL}/admin/activity`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleAppointmentResponse<AdminAppointmentActivityResponse>(response);
}

export async function getAppointmentById(
  token: string,
  appointmentId: string
): Promise<Appointment> {
  const response = await safeFetch(`${APPOINTMENT_API_URL}/${appointmentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleAppointmentResponse<Appointment>(response);
}

export async function getAppointmentTracking(
  token: string,
  appointmentId: string
): Promise<AppointmentTrackingResponse> {
  const response = await safeFetch(
    `${APPOINTMENT_API_URL}/${appointmentId}/tracking`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleAppointmentResponse<AppointmentTrackingResponse>(response);
}

export async function updateDoctorAppointmentStatus(
  token: string,
  appointmentId: string,
  status: Extract<AppointmentStatus, "confirmed" | "completed" | "cancelled">,
  note?: string
): Promise<AppointmentMutationResponse> {
  const response = await safeFetch(`${APPOINTMENT_API_URL}/${appointmentId}/status`, {
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

  return handleAppointmentResponse<AppointmentMutationResponse>(response);
}

export async function updateAppointmentStatus(
  token: string,
  appointmentId: string,
  status: Extract<AppointmentStatus, "confirmed" | "completed" | "cancelled">,
  note: string
): Promise<AppointmentRecord> {
  const currentAppointments = await getMyAppointments(token).catch(() => []);
  const existingAppointment =
    currentAppointments.find((appointment) => appointment._id === appointmentId) ??
    ({
      _id: appointmentId,
      patientId: "",
      doctorId: "",
      doctorName: "",
      specialization: "",
      appointmentDate: "",
      appointmentTime: "",
      status,
      paymentStatus: "pending",
    } as Appointment);

  const data = await updateDoctorAppointmentStatus(
    token,
    appointmentId,
    status,
    note
  );

  return withFallbackAppointment(data, {
    ...existingAppointment,
    status,
  });
}

export async function cancelAppointment(
  token: string,
  appointmentId: string
): Promise<Appointment & { message: string; appointment: Appointment }> {
  const currentAppointments = await getMyAppointments(token).catch(() => []);
  const existingAppointment =
    currentAppointments.find((appointment) => appointment._id === appointmentId) ??
    ({
      _id: appointmentId,
      patientId: "",
      doctorId: "",
      doctorName: "",
      specialization: "",
      appointmentDate: "",
      appointmentTime: "",
      status: "cancelled",
      paymentStatus: "pending",
    } as Appointment);

  const response = await safeFetch(`${APPOINTMENT_API_URL}/${appointmentId}/cancel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await handleAppointmentResponse<AppointmentMutationResponse>(response);

  return withFallbackAppointment(data, {
    ...existingAppointment,
    status: "cancelled",
  });
}
