const { getAuthProfile } = require("../services/authService");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const response = await getAuthProfile(token);

    req.token = token;
    req.authUser = response.user;
    next();
  } catch (error) {
    return res.status(error.response?.status || 401).json({
      message: error.response?.data?.message || "Unauthorized",
    });
  }
};

module.exports = authMiddleware;
