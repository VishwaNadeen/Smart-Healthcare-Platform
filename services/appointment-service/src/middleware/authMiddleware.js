const { getAuthProfile } = require("../services/authService");

const getUserIdFromUser = (user) =>
  user?._id || user?.id || user?.userId || user?.patientId || user?.sub || null;

const getRoleFromUser = (user) =>
  (user?.role || user?.userType || user?.accountType || "").toLowerCase();

const getAuthContext = async (req) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return { errorStatus: 401, message: "Authorization token is required" };
  }

  const token = authHeader.split(" ")[1];

  try {
    const response = await getAuthProfile(token);
    const authUser = response.user || {};
    const userId = getUserIdFromUser(authUser);
    const role = getRoleFromUser(authUser);

    if (!userId) {
      return { errorStatus: 401, message: "Invalid auth profile: missing user id" };
    }

    return {
      user: {
        id: userId,
        role,
        tokenPayload: authUser,
      },
    };
  } catch (error) {
    return {
      errorStatus: error.status || 401,
      message: error.data?.message || error.message || "Unauthorized",
    };
  }
};

const requirePatientAuth = async (req, res, next) => {
  const authContext = await getAuthContext(req);

  if (authContext.errorStatus) {
    return res.status(authContext.errorStatus).json({
      message: authContext.message,
    });
  }

  const role = authContext.user.role;
  if (role && role !== "patient") {
    return res.status(403).json({
      message: "Only patients can access this endpoint",
    });
  }

  req.user = {
    ...authContext.user,
    role: role || "patient",
  };

  return next();
};

const requireDoctorAuth = async (req, res, next) => {
  const authContext = await getAuthContext(req);

  if (authContext.errorStatus) {
    return res.status(authContext.errorStatus).json({
      message: authContext.message,
    });
  }

  const role = authContext.user.role;
  if (role && role !== "doctor") {
    return res.status(403).json({
      message: "Only doctors can access this endpoint",
    });
  }

  req.user = {
    ...authContext.user,
    role: role || "doctor",
  };

  return next();
};

const enforceDoctorParamOwnership = (req, res, next) => {
  const requestedDoctorId = req.params.doctorId;
  const authenticatedDoctorId = req.user?.id;

  if (!authenticatedDoctorId) {
    return res.status(401).json({
      message: "Doctor authentication is required",
    });
  }

  if (String(requestedDoctorId) !== String(authenticatedDoctorId)) {
    return res.status(403).json({
      message: "You can only access your own appointments",
    });
  }

  return next();
};

const enforceDoctorAppointmentOwnership = (req, appointment) => {
  const authenticatedDoctorId = req.user?.id;

  if (!authenticatedDoctorId) {
    return false;
  }

  return String(appointment.doctorId) === String(authenticatedDoctorId);
};

const enforcePatientParamOwnership = (req, res, next) => {
  const requestedPatientId = req.params.patientId;
  const authenticatedPatientId = req.user?.id;

  if (!authenticatedPatientId) {
    return res.status(401).json({
      message: "Patient authentication is required",
    });
  }

  if (String(requestedPatientId) !== String(authenticatedPatientId)) {
    return res.status(403).json({
      message: "You can only access your own appointments",
    });
  }

  return next();
};

module.exports = {
  requirePatientAuth,
  requireDoctorAuth,
  enforcePatientParamOwnership,
  enforceDoctorParamOwnership,
  enforceDoctorAppointmentOwnership,
};
