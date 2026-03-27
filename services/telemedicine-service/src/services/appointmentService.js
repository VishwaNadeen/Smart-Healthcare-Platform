
const getAppointmentServiceUrl = () =>
  process.env.APPOINTMENT_SERVICE_URL || "http://localhost:5001";

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

const getAppointmentById = async (appointmentId) => {
  const appointmentUrl = `${getAppointmentServiceUrl()}/api/appointments/internal/${appointmentId}`;
  let response;

  try {
    response = await fetch(appointmentUrl, {
      headers: getInternalHeaders(),
    });
  } catch (error) {
    const serviceError = new Error(
      `Appointment service is unavailable. Please verify it is running at ${getAppointmentServiceUrl()}`
    );
    serviceError.status = 503;
    serviceError.cause = error;
    throw serviceError;
  }

  const data = await extractJson(response);

  if (!response.ok) {
    const error = new Error(data?.message || "Failed to fetch appointment");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

const updateAppointmentStatus = async (appointmentId, status, note = "") => {
  const appointmentUrl = `${getAppointmentServiceUrl()}/api/appointments/internal/${appointmentId}/status`;
  let response;

  try {
    response = await fetch(appointmentUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getInternalHeaders(),
      },
      body: JSON.stringify({ status, note }),
    });
  } catch (error) {
    const serviceError = new Error(
      `Failed to sync appointment status with appointment service at ${getAppointmentServiceUrl()}`
    );
    serviceError.status = 503;
    serviceError.cause = error;
    throw serviceError;
  }

  const data = await extractJson(response);

  if (!response.ok) {
    const error = new Error(data?.message || "Failed to update appointment status");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

module.exports = {
  getAppointmentById,
  updateAppointmentStatus,
};
