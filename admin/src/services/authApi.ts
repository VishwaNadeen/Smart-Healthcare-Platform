import { AUTH_API_URL } from "../config/api";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: string;
};

export type LoginResponse = AuthUser & {
  token: string;
  message: string;
};

export async function loginAdmin(email: string, password: string) {
  const response = await fetch(`${AUTH_API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data: LoginResponse | { message?: string } = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  const loginData = data as LoginResponse;

  if (loginData.role !== "admin") {
    throw new Error("This account is not allowed to access the admin panel");
  }

  return loginData;
}

export async function getCurrentUser(token: string) {
  const response = await fetch(`${AUTH_API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data: { user?: AuthUser; message?: string } = await response.json();

  if (!response.ok || !data.user) {
    throw new Error(data.message || "Failed to fetch current user");
  }

  if (data.user.role !== "admin") {
    throw new Error("This account is not allowed to access the admin panel");
  }

  return data.user;
}
