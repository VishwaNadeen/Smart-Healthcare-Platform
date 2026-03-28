const { getAuthProfile } = require("../services/authProfileService");
const Doctor = require("../models/doctorModel");

const getUserIdFromUser = (user) =>
  user?._id || user?.id || user?.userId || user?.sub || user?.doctorId || null;

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

const requireAuth = async (req, res, next) => {
  const authContext = await getAuthContext(req);

  if (authContext.errorStatus) {
    return res.status(authContext.errorStatus).json({
      message: authContext.message,
    });
  }

  req.user = {
    ...authContext.user,
    role: authContext.user.role || "",
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

  if (authContext.user.role !== "doctor") {
    return res.status(403).json({
      message: "Doctor access is required",
    });
  }

  req.user = authContext.user;
  return next();
};

const requireAdminAuth = async (req, res, next) => {
  const authContext = await getAuthContext(req);

  if (authContext.errorStatus) {
    return res.status(authContext.errorStatus).json({
      message: authContext.message,
    });
  }

  if (authContext.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access is required",
    });
  }

  req.user = authContext.user;
  return next();
};

const enforceDoctorResourceOwnership = async (req, res, next) => {
  if (req.user?.role === "admin") {
    return next();
  }

  if (req.user?.role !== "doctor") {
    return res.status(403).json({
      message: "Doctor access is required",
    });
  }

  const loggedInDoctor = await Doctor.findOne({ authUserId: req.user.id }).select("_id +authUserId");

  if (!loggedInDoctor) {
    return res.status(404).json({
      message: "Doctor profile not found for this account",
    });
  }

  const doctor = await Doctor.findById(req.params.id).select("_id +authUserId");

  if (!doctor) {
    return res.status(404).json({
      message: "Doctor not found",
    });
  }

  if (String(doctor._id) !== String(loggedInDoctor._id)) {
    return res.status(403).json({
      message: "You can only modify your own doctor profile",
    });
  }

  return next();
};

module.exports = {
  requireAuth,
  requireDoctorAuth,
  requireAdminAuth,
  enforceDoctorResourceOwnership,
};
