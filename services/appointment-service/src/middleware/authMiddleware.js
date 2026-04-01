const { getAuthProfile } = require("../services/authService");

const getDoctorServiceUrl = () =>
  process.env.DOCTOR_SERVICE_URL || "http://localhost:5003";

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    const error = new Error("Authorization token is required");
    error.status = 401;
    throw error;
  }

  return authHeader.split(" ")[1];
};

const normalizeRole = (role) => {
  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole === "user" || normalizedRole === "patient") {
    return "patient";
  }

  if (normalizedRole === "doctor") {
    return "doctor";
  }

  if (normalizedRole === "admin") {
    return "admin";
  }

  return normalizedRole;
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
    role: normalizeRole(user.role),
  };
};

const getAuthUser = async (req) => {
  const token = extractBearerToken(req);
  const profile = await getAuthProfile(token);

  req.token = token;
  return buildUserFromProfile(profile);
};

const getCurrentDoctorProfile = async (token) => {
  const response = await fetch(`${getDoctorServiceUrl()}/api/doctors/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Failed to fetch doctor profile");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
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

    try {
      const doctorProfile = await getCurrentDoctorProfile(req.token);

      if (doctorProfile?._id) {
        user.doctorProfileId = String(doctorProfile._id);
      }
    } catch (error) {
      if (error?.status === 404) {
        return res.status(404).json({
          message: "Doctor profile not found for this account",
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(error.status || 401).json({
      message: error.message || "Unauthorized",
    });
  }
};

const requireAdminAuth = async (req, res, next) => {
  const authContext = await getAuthContext(req);

  if (authContext.errorStatus) {
    return res.status(authContext.errorStatus).json({
      message: authContext.message,
    });
  }

  const role = authContext.user.role;
  if (role !== "admin") {
    return res.status(403).json({
      message: "Only admins can access this endpoint",
    });
  }

  req.user = authContext.user;
  return next();
};

const enforceDoctorParamOwnership = (req, res, next) => {
  const requestedDoctorId = String(req.params.doctorId || "");
  const authDoctorId = String(req.user?.id || "");
  const profileDoctorId = String(req.user?.doctorProfileId || "");

  if (
    requestedDoctorId !== authDoctorId &&
    requestedDoctorId !== profileDoctorId
  ) {
    return res.status(403).json({
      message: "You can only access your own appointments",
    });
  }

  next();
};

const enforceDoctorAppointmentOwnership = (req, appointment) => {
  const appointmentDoctorId = String(appointment.doctorId || "");
  const authDoctorId = String(req.user?.id || "");
  const profileDoctorId = String(req.user?.doctorProfileId || "");

  return (
    appointmentDoctorId === authDoctorId ||
    appointmentDoctorId === profileDoctorId
  );
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
  requireAdminAuth,
  enforcePatientParamOwnership,
  enforceDoctorParamOwnership,
  enforceDoctorAppointmentOwnership,
};
