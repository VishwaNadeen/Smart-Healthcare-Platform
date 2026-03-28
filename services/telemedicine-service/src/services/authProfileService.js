const getAuthServiceUrl = () =>
  process.env.AUTH_SERVICE_URL || "http://localhost:5002";

const getAuthProfile = async (token) => {
  const response = await fetch(`${getAuthServiceUrl()}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Unauthorized");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

module.exports = {
  getAuthProfile,
};