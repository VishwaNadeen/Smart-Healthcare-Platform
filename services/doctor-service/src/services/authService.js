const axios = require("axios");

// Default to auth-service port 5002 (matches auth-service/src/server.js)
const getAuthServiceUrl = () => process.env.AUTH_SERVICE_URL || "http://localhost:5002";

const registerDoctorAuth = async ({ fullName, email, password }) => {
  const response = await axios.post(`${getAuthServiceUrl()}/api/auth/register`, {
    username: fullName,
    email,
    password,
    role: "doctor",
  });

  return response.data;
};

const deleteDoctorAuthByEmail = async (email) => {
  const headers = {};
  if (process.env.INTERNAL_SERVICE_SECRET) {
    headers["x-internal-service-secret"] = process.env.INTERNAL_SERVICE_SECRET;
  }

  const response = await axios.delete(`${getAuthServiceUrl()}/api/auth/internal/users/by-email`, {
    data: { email },
    headers,
  });

  return response.data;
};

module.exports = {
  registerDoctorAuth,
  deleteDoctorAuthByEmail,
};
