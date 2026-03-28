const AUTH_SERVICE_URL =
  import.meta.env.VITE_AUTH_SERVICE_URL || "http://localhost:5002";

const DOCTOR_SERVICE_URL =
  import.meta.env.VITE_DOCTOR_SERVICE_URL || "http://localhost:5003";

const PATIENT_SERVICE_URL =
  import.meta.env.VITE_PATIENT_SERVICE_URL || "http://localhost:5005";

const TELEMEDICINE_SERVICE_URL =
  import.meta.env.VITE_TELEMEDICINE_SERVICE_URL || "http://localhost:5007";

export const AUTH_API_URL = `${AUTH_SERVICE_URL}/api/auth`;
export const DOCTOR_API_URL = `${DOCTOR_SERVICE_URL}/api/doctors`;
export const PATIENT_API_URL = `${PATIENT_SERVICE_URL}/api/patients`;
export const TELEMEDICINE_API_URL = `${TELEMEDICINE_SERVICE_URL}/api/telemedicine`;
export const TELEMEDICINE_UPLOADS_BASE_URL = TELEMEDICINE_SERVICE_URL;