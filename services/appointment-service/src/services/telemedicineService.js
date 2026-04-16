const getTelemedicineServiceUrl = () =>
  process.env.TELEMEDICINE_SERVICE_URL || "http://localhost:5007";

const getInternalHeaders = () => {
  const secret = process.env.INTERNAL_SERVICE_SECRET || "";

  return secret
    ? {
        "x-internal-service-secret": secret,
      }
    : {};
};

const extractJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const createTelemedicineSessionForAppointment = async (appointmentId) => {
  const telemedicineUrl = `${getTelemedicineServiceUrl()}/api/telemedicine/internal/session`;
  let response;

  try {
    response = await fetch(telemedicineUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getInternalHeaders(),
      },
      body: JSON.stringify({
        appointmentId: String(appointmentId),
      }),
    });
  } catch (error) {
    const serviceError = new Error(
      `Telemedicine service is unavailable. Please verify it is running at ${getTelemedicineServiceUrl()}`
    );
    serviceError.status = 503;
    serviceError.cause = error;
    throw serviceError;
  }

  const data = await extractJson(response);

  if (!response.ok) {
    const error = new Error(data?.message || "Failed to create telemedicine session");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

module.exports = {
  createTelemedicineSessionForAppointment,
};
