export const getAccessToken = (): string => {
  const legacyToken = localStorage.getItem("token");

  if (legacyToken) {
    return legacyToken;
  }

  const storedAdminAuth = localStorage.getItem("admin_auth");

  if (!storedAdminAuth) {
    return "";
  }

  try {
    const parsed = JSON.parse(storedAdminAuth) as { token?: string };
    return parsed.token || "";
  } catch {
    return "";
  }
};

export const getAuthHeaders = (): HeadersInit => {
  const token = getAccessToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};
