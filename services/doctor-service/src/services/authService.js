const axios = require("axios");

const getAuthServiceUrl = () =>
  process.env.AUTH_SERVICE_URL || "http://localhost:5002";

const getInternalHeaders = () => {
  const headers = {};

  if (process.env.INTERNAL_SERVICE_SECRET) {
    headers["x-internal-service-secret"] = process.env.INTERNAL_SERVICE_SECRET;
  }

  return headers;
};

const registerDoctorAuth = async ({ fullName, email, password }) => {
  const response = await axios.post(`${getAuthServiceUrl()}/api/auth/register`, {
    username: String(fullName || "").trim(),
    email: String(email || "").trim().toLowerCase(),
    password,
    role: "doctor",
  });

  return response.data;
};

const deleteAuthAccountByEmail = async (email) => {
  const response = await axios.delete(
    `${getAuthServiceUrl()}/api/auth/internal/users/by-email`,
    {
      headers: getInternalHeaders(),
      data: { email },
    }
  );

  return response.data;
};

module.exports = {
  registerDoctorAuth,
  deleteAuthAccountByEmail,
};