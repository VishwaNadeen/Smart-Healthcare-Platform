const getNotificationServiceUrl = () =>
  process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5004"; // fixed: was 5007

const getAuthServiceUrl = () =>
  process.env.AUTH_SERVICE_URL || "http://localhost:5002";

const getPatientServiceUrl = () =>
  process.env.PATIENT_SERVICE_URL || "http://localhost:5005"; // fixed: was 5004

const getInternalHeaders = () => {
  const secret = process.env.INTERNAL_SERVICE_SECRET || "";
  return secret ? { "x-internal-service-secret": secret } : {};
};

const fetchAuthUserById = async (userId) => {
  try {
    const response = await fetch(
      `${getAuthServiceUrl()}/api/auth/internal/users/${userId}`,
      { headers: getInternalHeaders() }
    );
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    return data?.user || null;
  } catch {
    return null;
  }
};

const fetchPatientByAuthUserId = async (authUserId) => {
  try {
    const response = await fetch(
      `${getPatientServiceUrl()}/api/patients/internal/lookup/auth/${authUserId}`,
      { headers: getInternalHeaders() }
    );
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    return data?.patient || null;
  } catch {
    return null;
  }
};

const sendNotification = async ({ type, recipientId, recipientType, metadata }) => {
  const [authUser, patient] = await Promise.all([
    fetchAuthUserById(recipientId),
    fetchPatientByAuthUserId(recipientId),
  ]);

  if (!authUser?.email) return;

  const fullPhone = patient?.countryCode && patient?.phone
    ? `${patient.countryCode}${patient.phone}`
    : null;

  await fetch(`${getNotificationServiceUrl()}/api/notifications/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      channel: fullPhone ? "BOTH" : "EMAIL",
      recipientType: recipientType.toUpperCase(),
      recipientId,
      recipientEmail: authUser.email,
      recipientPhone: fullPhone || undefined,
      recipientName: authUser.username || "",
      metadata,
    }),
  });
};

const notify = (params) => {
  sendNotification(params).catch((err) =>
    console.error("[NotificationService] Failed to send notification:", err.message)
  );
};

module.exports = { notify };
