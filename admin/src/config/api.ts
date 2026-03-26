const AUTH_SERVICE_URL =
  import.meta.env.AUTH_SERVICE_URL || "http://localhost:5003";
const ADMIN_SERVICE_URL =
  import.meta.env.ADMIN_SERVICE_URL || "http://localhost:5007";

export const AUTH_API_URL = `${AUTH_SERVICE_URL}/api/auth`;
export const ADMIN_API_URL = `${ADMIN_SERVICE_URL}/api/admin`;
