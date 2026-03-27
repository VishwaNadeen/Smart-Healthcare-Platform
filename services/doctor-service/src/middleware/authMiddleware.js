const jwt = require("jsonwebtoken");

const getUserIdFromTokenPayload = (payload) =>
  payload.userId || payload.id || payload._id || payload.sub || payload.doctorId || null;

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

const requireAuth = (req, res, next) => {
  const authContext = getAuthContext(req);

  if (authContext.errorStatus) {
    return res.status(authContext.errorStatus).json({
      message: authContext.message,
      ...(authContext.error ? { error: authContext.error } : {}),
    });
  }

  req.user = {
    ...authContext.user,
    role: authContext.user.role || "",
  };

  return next();
};

module.exports = {
  requireAuth,
};
