const getAppointmentServiceUrl = () =>
  process.env.APPOINTMENT_SERVICE_URL || "http://localhost:5001";

const extractJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const getAppointmentById = async (appointmentId) => {
  const appointmentUrl = `${getAppointmentServiceUrl()}/api/appointments/${appointmentId}`;
  let response;

  try {
    response = await fetch(appointmentUrl);
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

module.exports = {
  getAppointmentById,
};
