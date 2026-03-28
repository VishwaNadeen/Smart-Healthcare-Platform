const { getAuthProfile } = require("../services/authService");

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    const error = new Error("Authorization token is required");
    error.status = 401;
    throw error;
  }

  return authHeader.split(" ")[1];
};

const buildUserFromProfile = (profile) => {
  const user = profile?.user;

  if (!user?._id || !user?.role) {
    const error = new Error("Invalid auth profile response");
    error.status = 401;
    throw error;
  }

  return {
    id: String(user._id),
    username: user.username || "",
    email: user.email || "",
    role: String(user.role || "").toLowerCase(),
  };
};

const getAuthUser = async (req) => {
  const token = extractBearerToken(req);
  const profile = await getAuthProfile(token);

  req.token = token;
  return buildUserFromProfile(profile);
};

const requirePatientAuth = async (req, res, next) => {
  try {
    const user = await getAuthUser(req);

    if (user.role !== "patient") {
      return res.status(403).json({
        message: "Only patients can access this endpoint",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(error.status || 401).json({
      message: error.message || "Unauthorized",
    });
  }
};

const requireDoctorAuth = async (req, res, next) => {
  try {
    const user = await getAuthUser(req);

    if (user.role !== "doctor") {
      return res.status(403).json({
        message: "Only doctors can access this endpoint",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(error.status || 401).json({
      message: error.message || "Unauthorized",
    });
  }
};

const enforceDoctorParamOwnership = (req, res, next) => {
  if (String(req.params.doctorId) !== String(req.user?.id)) {
    return res.status(403).json({
      message: "You can only access your own appointments",
    });
  }

  next();
};

const enforceDoctorAppointmentOwnership = (req, appointment) => {
  return String(appointment.doctorId) === String(req.user?.id);
};

const enforcePatientParamOwnership = (req, res, next) => {
  if (String(req.params.patientId) !== String(req.user?.id)) {
    return res.status(403).json({
      message: "You can only access your own appointments",
    });
  }

  next();
};

module.exports = {
  requirePatientAuth,
  requireDoctorAuth,
  enforcePatientParamOwnership,
  enforceDoctorParamOwnership,
  enforceDoctorAppointmentOwnership,
};