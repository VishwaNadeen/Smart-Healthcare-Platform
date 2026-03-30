const { getAuthProfile } = require("../services/authProfileService");

const getDoctorServiceUrl = () =>
  process.env.DOCTOR_SERVICE_URL || "http://localhost:5003";

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

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token is required",
      });
    }

    const token = authHeader.split(" ")[1];
    const profile = await getAuthProfile(token);
    const user = profile?.user;

    if (!user?._id || !user?.role) {
      return res.status(401).json({
        message: "Invalid auth profile response",
      });
    }

    if (!["doctor", "patient"].includes(String(user.role).toLowerCase())) {
      return res.status(403).json({
        message: "Access denied for this role",
      });
    }

    req.token = token;
    req.user = {
      userId: String(user._id),
      username: user.username || "",
      email: user.email || "",
      role: String(user.role || "").toLowerCase(),
    };

    if (req.user.role === "doctor") {
      try {
        const doctorProfile = await getCurrentDoctorProfile(token);

        if (doctorProfile?._id) {
          req.user.doctorProfileId = String(doctorProfile._id);
        }
      } catch (error) {
        if (error?.status === 404) {
          return res.status(404).json({
            message: "Doctor profile not found for this account",
          });
        }
      }
    }

    next();
  } catch (error) {
    return res.status(error.status || 401).json({
      message: error.message || "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
