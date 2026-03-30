const getAuthServiceUrl = () =>
  process.env.AUTH_SERVICE_URL || "http://localhost:5002";

const getInternalHeaders = () => {
  const secret = process.env.INTERNAL_SERVICE_SECRET || "";

  return secret
    ? {
        "x-internal-service-secret": secret,
      }
    : {};
};

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

const getAuthUserById = async (userId) => {
  const response = await fetch(`${getAuthServiceUrl()}/api/auth/internal/users/${userId}`, {
    headers: getInternalHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Failed to fetch auth user");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data?.user || null;
};

module.exports = {
  getAuthProfile,
  getAuthUserById,
};
