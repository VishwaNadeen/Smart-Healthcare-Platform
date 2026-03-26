const jwt = require("jsonwebtoken");

const getUserIdFromTokenPayload = (payload) =>
  payload.userId || payload.id || payload._id || payload.patientId || payload.sub || null;

const getRoleFromTokenPayload = (payload) =>
  (payload.role || payload.userType || payload.accountType || "").toLowerCase();

const getAuthContext = (req) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return { errorStatus: 401, message: "Authorization token is required" };
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return { errorStatus: 500, message: "JWT_SECRET is not configured" };
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userId = getUserIdFromTokenPayload(decoded);
    const role = getRoleFromTokenPayload(decoded);

    if (!userId) {
      return { errorStatus: 401, message: "Invalid token payload: missing user id" };
    }

    return {
      user: {
        id: userId,
        role,
        tokenPayload: decoded,
      },
    };
  } catch (error) {
    return {
      errorStatus: 401,
      message: "Invalid or expired token",
      error: error.message,
    };
  }
};

const requirePatientAuth = (req, res, next) => {
  const authContext = getAuthContext(req);

  if (authContext.errorStatus) {
    return res.status(authContext.errorStatus).json({
      message: authContext.message,
      ...(authContext.error ? { error: authContext.error } : {}),
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

const requireDoctorAuth = (req, res, next) => {
  const authContext = getAuthContext(req);

  if (authContext.errorStatus) {
    return res.status(authContext.errorStatus).json({
      message: authContext.message,
      ...(authContext.error ? { error: authContext.error } : {}),
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
