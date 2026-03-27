import { AUTH_API_URL } from "../config/api";

export type LoginResponse = {
  message: string;
  id: string;
  username: string;
  email: string;
  role: "doctor" | "patient" | "admin";
  token: string;
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
    const errorMessage =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : `Request failed with status ${response.status}`;

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
  const response = await fetch(`${AUTH_API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<LoginResponse>(response);
}

export async function getUserStats(): Promise<UserStatsResponse> {
  const response = await fetch(`${AUTH_API_URL}/stats`);
  return handleResponse<UserStatsResponse>(response);
}
