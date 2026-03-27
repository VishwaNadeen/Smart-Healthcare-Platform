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

module.exports = {
  registerDoctorAuth,
};
