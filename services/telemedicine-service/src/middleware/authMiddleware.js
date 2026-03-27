const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token is required",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.userId || !decoded?.role) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    if (!["doctor", "patient"].includes(decoded.role)) {
      return res.status(403).json({
        message: "Access denied for this role",
      });
    }

    req.user = {
      userId: String(decoded.userId),
      username: decoded.username || "",
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

module.exports = authMiddleware;
