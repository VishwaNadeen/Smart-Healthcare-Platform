const Doctor = require("../models/doctorModel");
const { getAuthProfile } = require("../services/authProfileService");

const buildAuthUser = (profile) => {
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

const getDecodedToken = async (req) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    const error = new Error("Authorization token is required");
    error.status = 401;
    throw error;
  }

  const token = authHeader.split(" ")[1];
  const profile = await getAuthProfile(token);

  req.token = token;
  return buildAuthUser(profile);
};

const requireAuth = async (req, res, next) => {
  try {
    req.user = await getDecodedToken(req);
    next();
  } catch (error) {
    return res.status(error.status || 401).json({
      message: error.message || "Unauthorized",
    });
  }
};

const requireDoctorAuth = async (req, res, next) => {
  try {
    const user = await getDecodedToken(req);

    if (user.role !== "doctor") {
      return res.status(403).json({
        message: "Doctor access is required",
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

const requireAdminAuth = async (req, res, next) => {
  try {
    const user = await getDecodedToken(req);

    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access is required",
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

const enforceDoctorResourceOwnership = async (req, res, next) => {
  try {
    if (req.user?.role === "admin") {
      return next();
    }

    if (req.user?.role !== "doctor") {
      return res.status(403).json({
        message: "Doctor access is required",
      });
    }

    const doctor = await Doctor.findById(req.params.id).select("_id +authUserId email");

    if (!doctor) {
      return res.status(404).json({
        message: "Doctor not found",
      });
    }

    const ownsByAuthUserId =
      String(doctor.authUserId || "") === String(req.user.id || "");

    const ownsByEmail =
      req.user.email &&
      String(doctor.email || "").toLowerCase() === req.user.email.toLowerCase();

    if (!ownsByAuthUserId && !ownsByEmail) {
      return res.status(403).json({
        message: "You can only modify your own doctor profile",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: "Failed to authorize doctor resource",
      error: error.message,
    });
  }
};

module.exports = {
  requireAuth,
  requireDoctorAuth,
  requireAdminAuth,
  enforceDoctorResourceOwnership,
};
