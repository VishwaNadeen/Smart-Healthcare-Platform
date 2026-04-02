import { PATIENT_API_URL } from "../config/api";

export type PatientFieldErrors = Partial<
  Record<
    | "firstName"
    | "lastName"
    | "title"
    | "nic"
    | "email"
    | "password"
    | "countryCode"
    | "phone"
    | "birthday"
    | "address"
    | "country",
    string
  >
>;

type ErrorResponsePayload = {
  error?: string;
  message?: string;
  errors?: string[];
  fieldErrors?: PatientFieldErrors;
};

export class PatientApiError extends Error {
  fieldErrors: PatientFieldErrors;

  constructor(message: string, fieldErrors: PatientFieldErrors = {}) {
    super(message);
    this.name = "PatientApiError";
    this.fieldErrors = fieldErrors;
  }
}

export type PatientRegisterPayload = {
  title: "Mr" | "Miss" | "Mrs" | "";
  firstName: string;
  lastName: string;
  nic: string;
  email: string;
  password: string;
  countryCode: string;
  phone: string;
  birthday: string;
  address: string;
  country: string;
};

export type PatientData = {
  _id: string;
  title?: "Mr" | "Miss" | "Mrs" | "";
  firstName: string;
  lastName: string;
  nic?: string;
  email: string;
  countryCode: string;
  phone: string;
  birthday: string;
  gender?: "male" | "female" | "other";
  address: string;
  country: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
};

export type PatientRegisterResponse = {
  message: string;
  verificationRequired?: boolean;
  expiresInMinutes?: number;
  patient?: PatientData;
};

export type PatientProfileResponse = PatientData;

export type PatientSummaryResponse = {
  _id: string;
  authUserId: string;
  firstName: string;
  lastName: string;
  age: number | null;
  profileImage?: string;
};

export type PatientUpdatePayload = {
  title?: "Mr" | "Miss" | "Mrs" | "";
  firstName: string;
  lastName: string;
  nic?: string;
  email: string;
  countryCode: string;
  phone: string;
  birthday: string;
  gender?: "male" | "female" | "other" | "";
  address: string;
  country: string;
};

export type PatientUpdateResponse = {
  message: string;
  patient: PatientData;
};

export type PatientDeleteResponse = {
  message: string;
};

export type PatientUploadImageResponse = {
  message: string;
  profileImage: string;
  patient: PatientData;
};

export type PatientRemoveImageResponse = {
  message: string;
  patient: PatientData;
};

async function handlePatientResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | ErrorResponsePayload
    | T
    | null;

  if (!response.ok) {
    const fieldErrors =
      typeof data === "object" &&
      data !== null &&
      "fieldErrors" in data &&
      typeof data.fieldErrors === "object" &&
      data.fieldErrors !== null
        ? data.fieldErrors
        : {};

    const validationMessage =
      typeof data === "object" &&
      data !== null &&
      "errors" in data &&
      Array.isArray(data.errors) &&
      typeof data.errors[0] === "string"
        ? data.errors[0]
        : null;

    const errorMessage =
      validationMessage ||
      (typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
        ? data.message
        : `Request failed with status ${response.status}`);

    throw new PatientApiError(errorMessage, fieldErrors);
  }

  if (data === null) {
    throw new Error("Empty response received from patient service");
  }

  return data as T;
}

export async function registerPatient(
  payload: PatientRegisterPayload
): Promise<PatientRegisterResponse> {
  let response: Response;

  try {
    response = await fetch(`${PATIENT_API_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Unable to connect to the patient service. Please check that it is running."
    );
  }

  return handlePatientResponse<PatientRegisterResponse>(response);
}

export async function getCurrentPatientProfile(
  token: string
): Promise<PatientProfileResponse> {
  let response: Response;

  try {
    response = await fetch(`${PATIENT_API_URL}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the patient service. Please check that it is running."
    );
  }

  return handlePatientResponse<PatientProfileResponse>(response);
}

export async function getPatientSummaryByAuthUserId(
  token: string,
  authUserId: string
): Promise<PatientSummaryResponse> {
  let response: Response;

  try {
    response = await fetch(`${PATIENT_API_URL}/lookup/auth/${authUserId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the patient service. Please check that it is running."
    );
  }

  return handlePatientResponse<PatientSummaryResponse>(response);
}

export async function updateCurrentPatientProfile(
  token: string,
  payload: PatientUpdatePayload
): Promise<PatientUpdateResponse> {
  let response: Response;

  try {
    response = await fetch(`${PATIENT_API_URL}/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Unable to connect to the patient service. Please check that it is running."
    );
  }

  return handlePatientResponse<PatientUpdateResponse>(response);
}

export async function uploadCurrentPatientProfileImage(
  token: string,
  file: File
): Promise<PatientUploadImageResponse> {
  const formData = new FormData();
  formData.append("profileImage", file);

  let response: Response;

  try {
    response = await fetch(`${PATIENT_API_URL}/me/profile-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch {
    throw new Error(
      "Unable to connect to the patient service. Please check that it is running."
    );
  }

  return handlePatientResponse<PatientUploadImageResponse>(response);
}

export async function deleteCurrentPatient(
  token: string,
  password: string
): Promise<PatientDeleteResponse> {
  let response: Response;

  try {
    response = await fetch(`${PATIENT_API_URL}/me`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    });
  } catch {
    throw new Error(
      "Unable to connect to the patient service. Please check that it is running."
    );
  }

  return handlePatientResponse<PatientDeleteResponse>(response);
}

export async function removeCurrentPatientProfileImage(
  token: string
): Promise<PatientRemoveImageResponse> {
  let response: Response;

  try {
    response = await fetch(`${PATIENT_API_URL}/me/profile-image`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the patient service. Please check that it is running."
    );
  }

  return handlePatientResponse<PatientRemoveImageResponse>(response);
}
