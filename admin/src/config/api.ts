const AUTH_SERVICE_URL =
  import.meta.env.AUTH_SERVICE_URL || "http://localhost:5003";
const TELEMEDICINE_SERVICE_URL =
  import.meta.env.TELEMEDICINE_SERVICE_URL || "http://localhost:5007";

export const AUTH_API_URL = `${AUTH_SERVICE_URL}/api/auth`;
export const TELEMEDICINE_API_URL = `${TELEMEDICINE_SERVICE_URL}/api/telemedicine`;
export const TELEMEDICINE_FILES_API_URL = `${TELEMEDICINE_SERVICE_URL}/api/telemedicine/files`;
export const TELEMEDICINE_PRESCRIPTIONS_API_URL = `${TELEMEDICINE_SERVICE_URL}/api/telemedicine/prescriptions`;
