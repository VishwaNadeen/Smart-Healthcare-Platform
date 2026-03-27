const { getAuthProfile } = require("../services/authProfileService");

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

module.exports = {
  requireAuth,
};
