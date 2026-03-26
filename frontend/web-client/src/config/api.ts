const AUTH_SERVICE_URL =
  import.meta.env.VITE_AUTH_SERVICE_URL || "http://localhost:5001";
const TELEMEDICINE_SERVICE_URL =
  import.meta.env.VITE_TELEMEDICINE_SERVICE_URL || "http://localhost:5007";

export const AUTH_API_URL = `${AUTH_SERVICE_URL}/api/auth`;
export const TELEMEDICINE_API_URL = `${TELEMEDICINE_SERVICE_URL}/api/telemedicine`;
export const TELEMEDICINE_UPLOADS_BASE_URL = TELEMEDICINE_SERVICE_URL;
