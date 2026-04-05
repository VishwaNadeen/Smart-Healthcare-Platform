const AUTH_SERVICE_URL =
  import.meta.env.VITE_AUTH_SERVICE_URL || "http://localhost:5002";

const DOCTOR_SERVICE_URL =
  import.meta.env.VITE_DOCTOR_SERVICE_URL || "http://localhost:5003";

const PATIENT_SERVICE_URL =
  import.meta.env.VITE_PATIENT_SERVICE_URL || "http://localhost:5005";

const APPOINTMENT_SERVICE_URL =
  import.meta.env.VITE_APPOINTMENT_SERVICE_URL || "http://localhost:5001";

const TELEMEDICINE_SERVICE_URL =
  import.meta.env.VITE_TELEMEDICINE_SERVICE_URL || "http://localhost:5007";

const PAYMENT_SERVICE_URL =
  import.meta.env.VITE_PAYMENT_SERVICE_URL || "http://localhost:5006";

const NOTIFICATION_SERVICE_URL =
  import.meta.env.VITE_NOTIFICATION_SERVICE_URL || "http://localhost:5004";

export const AUTH_API_URL = `${AUTH_SERVICE_URL}/api/auth`;
export const DOCTOR_API_URL = `${DOCTOR_SERVICE_URL}/api/doctors`;
export const DOCTOR_SPECIALTY_API_URL = `${DOCTOR_SERVICE_URL}/api/specialties`;
export const PATIENT_API_URL = `${PATIENT_SERVICE_URL}/api/patients`;
export const APPOINTMENT_API_URL = `${APPOINTMENT_SERVICE_URL}/api/appointments`;
export const TELEMEDICINE_API_URL = `${TELEMEDICINE_SERVICE_URL}/api/telemedicine`;
export const TELEMEDICINE_UPLOADS_BASE_URL = TELEMEDICINE_SERVICE_URL;
export const PAYMENT_API_URL = `${PAYMENT_SERVICE_URL}/api/payments`;
export const NOTIFICATION_API_URL = `${NOTIFICATION_SERVICE_URL}/api/notifications`;
