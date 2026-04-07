import { DOCTOR_API_URL, DOCTOR_SPECIALTY_API_URL } from "../config/api";

export type DoctorProfileResponse = {
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
  availableDays?: string[];
  availableTimeSlots?: string[];
  consultationFee?: number;
  isAvailableForVideo?: boolean;
  availabilitySchedule?: Array<{
    day: string;
    startTime: string;
    endTime: string;
    mode: "in_person" | "video" | "both";
    maxAppointments: number;
  }>;
  supportsDigitalPrescriptions?: boolean;
  acceptsNewAppointments?: boolean;
  profileImage?: string;
  about?: string;
  status?: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export type DoctorSpecialty = {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

async function handleDoctorResponse<T>(response: Response): Promise<T> {
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
    throw new Error("Empty response received from doctor service");
  }

  return data;
}

export async function getCurrentDoctorProfile(
  token: string
): Promise<DoctorProfileResponse> {
  let response: Response;

  try {
    response = await fetch(`${DOCTOR_API_URL}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the doctor service. Please check that it is running."
    );
  }

  return handleDoctorResponse<DoctorProfileResponse>(response);
}

export async function getDoctorSpecialties(): Promise<DoctorSpecialty[]> {
  let response: Response;

  try {
    response = await fetch(DOCTOR_SPECIALTY_API_URL, {
      method: "GET",
    });
  } catch {
    throw new Error(
      "Unable to connect to the doctor service. Please check that it is running."
    );
  }

  return handleDoctorResponse<DoctorSpecialty[]>(response);
}

export async function getDoctors(params?: {
  specialization?: string;
  acceptsNewAppointments?: boolean;
}): Promise<DoctorProfileResponse[]> {
  let response: Response;

  try {
    const url = new URL(DOCTOR_API_URL);

    if (params?.specialization) {
      url.searchParams.set("specialization", params.specialization);
    }

    if (params?.acceptsNewAppointments !== undefined) {
      url.searchParams.set(
        "acceptsNewAppointments",
        String(params.acceptsNewAppointments)
      );
    }

    response = await fetch(url.toString(), {
      method: "GET",
    });
  } catch {
    throw new Error(
      "Unable to connect to the doctor service. Please check that it is running."
    );
  }

  return handleDoctorResponse<DoctorProfileResponse[]>(response);
}
