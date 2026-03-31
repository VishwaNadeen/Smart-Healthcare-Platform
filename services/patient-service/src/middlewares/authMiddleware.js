const { getAuthProfile } = require("../services/authProfileService");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No token provided",
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

    req.token = token;
    req.authUser = {
      userId: String(user._id),
      username: user.username || "",
      email: user.email || "",
      role: String(user.role || "").toLowerCase(),
    };

    next();
  } catch (error) {
    return res.status(error.status || 401).json({
      message: error.message || "Unauthorized",
    });
  }
};

module.exports = authMiddleware;