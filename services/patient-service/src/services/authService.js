const axios = require("axios");

const getAuthServiceUrl = () => process.env.AUTH_SERVICE_URL || "http://localhost:5001";

const registerPatientAuth = async ({ firstName, lastName, email, password }) => {
  const response = await axios.post(`${getAuthServiceUrl()}/api/auth/register`, {
    username: `${firstName} ${lastName}`.trim(),
    email,
    password,
    role: "patient",
  });

  return response.data;
};

const getAuthProfile = async (token) => {
  const response = await axios.get(`${getAuthServiceUrl()}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

const deleteAuthAccount = async (token) => {
  const response = await axios.delete(`${getAuthServiceUrl()}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

module.exports = {
  registerPatientAuth,
  getAuthProfile,
  deleteAuthAccount,
};
