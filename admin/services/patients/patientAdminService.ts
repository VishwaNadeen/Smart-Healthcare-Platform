import type {
  Patient,
  PatientAppointmentStats,
  PatientListResponse,
  PatientStatus,
  PatientUpdatePayload,
} from "../../types/patient";
import { getAuthHeaders } from "../../utils/auth";
import { APPOINTMENT_API_URL } from "../../src/config/api";

const PATIENT_SERVICE_BASE_URL = import.meta.env.VITE_PATIENT_SERVICE_URL;

if (!PATIENT_SERVICE_BASE_URL) {
  throw new Error("VITE_PATIENT_SERVICE_URL is not defined");
}

const ADMIN_PATIENT_BASE = `${PATIENT_SERVICE_BASE_URL}/api/patients/admin`;

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    let errorMessage = "Request failed";

    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } else {
      errorMessage = await response.text();
    }

    throw new Error(errorMessage || "Something went wrong");
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const patientAdminService = {
  async getAllPatients(search = ""): Promise<Patient[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await fetch(`${ADMIN_PATIENT_BASE}${query}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    const data = await handleResponse<Patient[] | PatientListResponse>(response);

    if (Array.isArray(data)) {
      return data;
    }

    return data.patients || [];
  },

  async getPatientById(patientId: string): Promise<Patient> {
    const response = await fetch(`${ADMIN_PATIENT_BASE}/${patientId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    const data = await handleResponse<Patient | { patient: Patient }>(response);
    return "patient" in data ? data.patient : data;
  },

  async updatePatient(
    patientId: string,
    payload: PatientUpdatePayload
  ): Promise<Patient> {
    const response = await fetch(`${ADMIN_PATIENT_BASE}/${patientId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await handleResponse<Patient | { patient: Patient }>(response);
    return "patient" in data ? data.patient : data;
  },

  async updatePatientStatus(
    patientId: string,
    status: PatientStatus
  ): Promise<Patient> {
    const response = await fetch(`${ADMIN_PATIENT_BASE}/${patientId}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    const data = await handleResponse<Patient | { patient: Patient }>(response);
    return "patient" in data ? data.patient : data;
  },

  async deletePatient(patientId: string): Promise<void> {
    const response = await fetch(`${ADMIN_PATIENT_BASE}/${patientId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    await handleResponse<void>(response);
  },

  async getPatientAppointmentStats(
    patientId: string
  ): Promise<PatientAppointmentStats> {
    const response = await fetch(
      `${APPOINTMENT_API_URL}/admin/patient/${patientId}/stats`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return handleResponse<PatientAppointmentStats>(response);
  },
};