import { AUTH_API_URL } from "../config/api";

export type LoginResponse = {
  message: string;
  id: string;
  username: string;
  email: string;
  role: "doctor" | "patient" | "admin";
  token: string;
};

export type RequestEmailVerificationResponse = {
  message: string;
  alreadyVerified: boolean;
  expiresInMinutes?: number;
};

export type VerifyEmailResponse = {
  message: string;
  alreadyVerified: boolean;
  user: {
    id: string;
    username: string;
    email: string;
    role: "doctor" | "patient" | "admin";
  };
};

export type BasicAuthResponse = {
  message: string;
};

export type UserStatsResponse = {
  message: string;
  totalUsers: number;
  doctorCount: number;
  patientCount: number;
  adminCount: number;
};

async function handleResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
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

    throw new Error(errorMessage);
  }

  if (data === null) {
    throw new Error("Empty response received from auth service");
  }

  return data;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch(`${AUTH_API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Unable to connect to the auth service. Please check that it is running."
    );
  }

  return handleResponse<LoginResponse>(response);
}

export async function getUserStats(): Promise<UserStatsResponse> {
  const response = await fetch(`${AUTH_API_URL}/stats`);
  return handleResponse<UserStatsResponse>(response);
}

export async function logoutUser(token: string): Promise<BasicAuthResponse> {
  let response: Response;

  try {
    response = await fetch(`${AUTH_API_URL}/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the auth service. Please check that it is running."
    );
  }

  return handleResponse<BasicAuthResponse>(response);
}

export async function requestEmailVerification(payload: {
  email: string;
}): Promise<RequestEmailVerificationResponse> {
  let response: Response;

  try {
    response = await fetch(`${AUTH_API_URL}/verify-email/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Unable to connect to the auth service. Please check that it is running."
    );
  }

  return handleResponse<RequestEmailVerificationResponse>(response);
}

export async function verifyEmail(payload: {
  email: string;
  otp: string;
}): Promise<VerifyEmailResponse> {
  let response: Response;

  try {
    response = await fetch(`${AUTH_API_URL}/verify-email/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Unable to connect to the auth service. Please check that it is running."
    );
  }

  return handleResponse<VerifyEmailResponse>(response);
}
