import { PATIENT_API_URL } from "../config/api";
import type { Report } from "../types/report";
import { getStoredTelemedicineAuth } from "../utils/telemedicineAuth";

export type UploadPatientReportResponse = {
  message: string;
  report: Report;
};

export type UpdatePatientReportResponse = {
  message: string;
  report: Report;
};

export type DeletePatientReportResponse = {
  message: string;
};

export type ReportFormPayload = {
  reportType: string;
  reportTitle: string;
  providerName: string;
  reportDate: string;
  notes: string;
};

function getAuthHeaders() {
  const auth = getStoredTelemedicineAuth();
  const headers: Record<string, string> = {};

  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
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
    throw new Error("Empty response received from patient service");
  }

  return data as T;
}

export const uploadPatientReport = async (
  patientId: string,
  file: File,
  payload: ReportFormPayload
): Promise<UploadPatientReportResponse> => {
  const formData = new FormData();
  formData.append("report", file);
  formData.append("reportType", payload.reportType);
  formData.append("reportTitle", payload.reportTitle);
  formData.append("providerName", payload.providerName);
  formData.append("reportDate", payload.reportDate);
  formData.append("notes", payload.notes);

  let response: Response;

  try {
    response = await fetch(`${PATIENT_API_URL}/${patientId}/reports`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });
  } catch {
    throw new Error(
      "Unable to connect to the patient service. Please check that it is running."
    );
  }

  return handleResponse<UploadPatientReportResponse>(response);
};

export const getPatientReports = async (
  patientId: string
): Promise<Report[]> => {
  let response: Response;

  try {
    response = await fetch(`${PATIENT_API_URL}/${patientId}/reports`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
  } catch {
    throw new Error(
      "Unable to connect to the patient service. Please check that it is running."
    );
  }

  return handleResponse<Report[]>(response);
};

export const updatePatientReport = async (
  patientId: string,
  reportId: string,
  payload: ReportFormPayload,
  file?: File | null
): Promise<UpdatePatientReportResponse> => {
  let response: Response;

  try {
    if (file) {
      const formData = new FormData();
      formData.append("report", file);
      formData.append("reportType", payload.reportType);
      formData.append("reportTitle", payload.reportTitle);
      formData.append("providerName", payload.providerName);
      formData.append("reportDate", payload.reportDate);
      formData.append("notes", payload.notes);

      response = await fetch(`${PATIENT_API_URL}/${patientId}/reports/${reportId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: formData,
      });
    } else {
      response = await fetch(`${PATIENT_API_URL}/${patientId}/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
    }
  } catch {
    throw new Error(
      "Unable to connect to the patient service. Please check that it is running."
    );
  }

  return handleResponse<UpdatePatientReportResponse>(response);
};

export const deletePatientReport = async (
  patientId: string,
  reportId: string
): Promise<DeletePatientReportResponse> => {
  let response: Response;

  try {
    response = await fetch(`${PATIENT_API_URL}/${patientId}/reports/${reportId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
  } catch {
    throw new Error(
      "Unable to connect to the patient service. Please check that it is running."
    );
  }

  return handleResponse<DeletePatientReportResponse>(response);
};
