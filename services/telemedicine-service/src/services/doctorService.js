const getDoctorServiceUrl = () =>
  process.env.DOCTOR_SERVICE_URL || "http://localhost:5003";

const extractJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const getDoctorById = async (doctorId) => {
  const doctorUrl = `${getDoctorServiceUrl()}/api/doctors/${doctorId}`;
  let response;

  try {
    response = await fetch(doctorUrl);
  } catch (error) {
    const serviceError = new Error(
      `Doctor service is unavailable. Please verify it is running at ${getDoctorServiceUrl()}`
    );
    serviceError.status = 503;
    serviceError.cause = error;
    throw serviceError;
  }

  const data = await extractJson(response);

  if (!response.ok) {
    const error = new Error(data?.message || "Failed to fetch doctor profile");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

module.exports = {
  getDoctorById,
};
