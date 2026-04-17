import { APPOINTMENT_API_URL, DOCTOR_API_URL } from "../config/api";

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
  active: boolean;
  rescheduleStatus?: "none" | "pending" | "approved" | "rejected";
  rescheduledDate?: string | null;
  rescheduledTime?: string | null;
  rescheduledAt?: string | null;
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

export type AppointmentAvailabilitySlot = {
  time: string;
  label: string;
};

export type GetDoctorAvailableSlotsPayload = {
  doctorId: string;
  appointmentDate: string;
};

export type GetDoctorAvailableSlotsResponse = {
  availableSlots: AppointmentAvailabilitySlot[];
};

type DoctorAvailabilityProfile = {
  availableTimeSlots?: string[];
  availabilitySchedule?: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
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

function formatSlotLabel(time: string): string {
  const [hours = "00", minutes = "00"] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSlotsFromSchedule(
  schedule: DoctorAvailabilityProfile["availabilitySchedule"],
  appointmentDate: string
): AppointmentAvailabilitySlot[] {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return [];
  }

  const date = new Date(`${appointmentDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return [];
  }

  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const matchingSchedule = schedule.find((slot) => slot.day === weekday);

  if (!matchingSchedule?.startTime || !matchingSchedule?.endTime) {
    return [];
  }

  const slots: AppointmentAvailabilitySlot[] = [];
  const [startHour = "0", startMinute = "0"] = matchingSchedule.startTime.split(":");
  const [endHour = "0", endMinute = "0"] = matchingSchedule.endTime.split(":");

  const current = new Date(date);
  current.setHours(Number(startHour), Number(startMinute), 0, 0);

  const end = new Date(date);
  end.setHours(Number(endHour), Number(endMinute), 0, 0);

  while (current < end) {
    const time = `${String(current.getHours()).padStart(2, "0")}:${String(
      current.getMinutes()
    ).padStart(2, "0")}`;

    slots.push({
      time,
      label: formatSlotLabel(time),
    });

    current.setMinutes(current.getMinutes() + 30);
  }

  return slots;
}

export async function getDoctorAvailableSlots(
  _token: string,
  payload: GetDoctorAvailableSlotsPayload
): Promise<GetDoctorAvailableSlotsResponse> {
  let response: Response;

  try {
    response = await fetch(`${DOCTOR_API_URL}/${payload.doctorId}`, {
      method: "GET",
    });
  } catch {
    throw new Error(
      "Unable to connect to the doctor service. Please check that it is running."
    );
  }

  const doctor = await handleAppointmentResponse<DoctorAvailabilityProfile>(response);

  const scheduleSlots = buildSlotsFromSchedule(
    doctor.availabilitySchedule,
    payload.appointmentDate
  );

  const fallbackSlots = Array.isArray(doctor.availableTimeSlots)
    ? doctor.availableTimeSlots.map((time) => ({
        time,
        label: formatSlotLabel(time),
      }))
    : [];

  const availableSlots = scheduleSlots.length > 0 ? scheduleSlots : fallbackSlots;

  return {
    availableSlots,
  };
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

  export async function rescheduleAppointment(
    token: string,
    appointmentId: string,
    rescheduledDate: string,
    rescheduledTime: string
  ): Promise<{ message: string; appointment: Appointment }> {
    let response: Response;

    try {
      response = await fetch(`${APPOINTMENT_API_URL}/${appointmentId}/reschedule`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rescheduledDate, rescheduledTime }),
      });
    } catch {
      throw new Error(
        "Unable to connect to the appointment service. Please check that it is running."
      );
    }

    return handleAppointmentResponse<{ message: string; appointment: Appointment }>(response);
  }

  export async function respondToReschedule(
  token: string,
  appointmentId: string,
  response: "approved" | "rejected"
): Promise<{ message: string; appointment: Appointment }> {
  let res: Response;

  try {
    res = await fetch(`${APPOINTMENT_API_URL}/${appointmentId}/reschedule/respond`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ response }),
    });
  } catch {
    throw new Error(
      "Unable to connect to the appointment service. Please check that it is running."
    );
  }

  return handleAppointmentResponse<{ message: string; appointment: Appointment }>(res);
}


