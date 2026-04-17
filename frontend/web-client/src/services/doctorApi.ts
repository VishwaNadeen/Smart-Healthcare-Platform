import { DOCTOR_API_URL, DOCTOR_SPECIALTY_API_URL } from "../config/api";

export type DoctorAvailabilityScheduleItem = {
  day: string;
  startTime: string;
  endTime: string;
  mode: "in_person" | "video" | "both";
  maxAppointments: number;
};

export type DoctorBlockedTimeRange = {
  startTime: string;
  endTime: string;
};

export type DoctorAvailabilityException = {
  date: string;
  isBlocked: boolean;
  blockedTimeRanges: DoctorBlockedTimeRange[];
  note?: string;
};

export type DoctorReviewNote = {
  note: string;
  status: "pending" | "in-review" | "approved" | "rejected";
  createdAt: string;
  createdByName?: string;
  createdByEmail?: string;
  editableFields?: string[];
};

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
  availabilitySchedule?: DoctorAvailabilityScheduleItem[];
  availabilityExceptions?: DoctorAvailabilityException[];
  supportsDigitalPrescriptions?: boolean;
  acceptsNewAppointments?: boolean;
  appointmentDurationMinutes?: number;
  profileImage?: string;
  about?: string;
  status?: "active" | "inactive";
  verificationStatus?: "pending" | "in-review" | "approved" | "rejected";
  verificationNote?: string;
  verifiedAt?: string | null;
  editableFields?: string[];
  reviewNotes?: DoctorReviewNote[];
  createdAt: string;
  updatedAt: string;
};

export type DoctorProfile = DoctorProfileResponse;

export type DoctorSpecialty = {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

export type DoctorDeleteResponse = {
  message: string;
  authDeleteResult?: unknown;
};

export type DoctorUploadImageResponse = {
  message: string;
  profileImage: string;
  doctor: DoctorProfileResponse;
};

type ErrorShape = {
  error?: string;
  message?: string;
};

async function handleDoctorResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as (T & ErrorShape) | null;

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  if (data === null) {
    throw new Error("Empty response received from doctor service");
  }

  return data as T;
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

export async function updateCurrentDoctorProfile(
  token: string,
  payload: Partial<DoctorProfileResponse>
): Promise<DoctorProfileResponse> {
  let response: Response;

  try {
    response = await fetch(`${DOCTOR_API_URL}/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Unable to connect to the doctor service. Please check that it is running."
    );
  }

  return handleDoctorResponse<DoctorProfileResponse>(response);
}

export async function deleteCurrentDoctor(
  token: string
): Promise<DoctorDeleteResponse> {
  let response: Response;

  try {
    response = await fetch(`${DOCTOR_API_URL}/me`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the doctor service. Please check that it is running."
    );
  }

  return handleDoctorResponse<DoctorDeleteResponse>(response);
}

export async function uploadDoctorProfileImage(
  token: string,
  file: File
): Promise<DoctorUploadImageResponse> {
  const formData = new FormData();
  formData.append("profileImage", file);

  let response: Response;

  try {
    response = await fetch(`${DOCTOR_API_URL}/me/profile-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch {
    throw new Error(
      "Unable to connect to the doctor service. Please check that it is running."
    );
  }

  return handleDoctorResponse<DoctorUploadImageResponse>(response);
}

export async function removeDoctorProfileImage(
  token: string
): Promise<DoctorProfileResponse> {
  let response: Response;

  try {
    response = await fetch(`${DOCTOR_API_URL}/me/profile-image`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the doctor service. Please check that it is running."
    );
  }

  const data = await handleDoctorResponse<{
    doctor?: DoctorProfileResponse;
    profileImage?: string;
  }>(response);

  return (
    data.doctor || {
      _id: "",
      fullName: "",
      email: "",
      phone: "",
      specialization: "",
      experience: 0,
      qualification: "",
      licenseNumber: "",
      createdAt: "",
      updatedAt: "",
      profileImage: data.profileImage || "",
    }
  );
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

export async function getDoctorById(
  doctorId: string
): Promise<DoctorProfileResponse> {
  let response: Response;

  try {
    response = await fetch(`${DOCTOR_API_URL}/${doctorId}`);
  } catch {
    throw new Error(
      "Unable to connect to the doctor service. Please check that it is running."
    );
  }

  return handleDoctorResponse<DoctorProfileResponse>(response);
}
