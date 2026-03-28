const { getAuthProfile } = require("../services/authProfileService");

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

    next();
  } catch (error) {
    return res.status(error.status || 401).json({
      message: error.message || "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;