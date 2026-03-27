const {
  registerUser,
  loginUser,
  logoutUser,
  deleteUserAccount,
  deleteUserByEmail,
  requestLoginOtp,
  verifyLoginOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  getUserStats,
} = require("../services/authService");

const serializeUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const hasValidInternalSecret = (req) => {
  const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;

  if (!expectedSecret) {
    return true;
  }

  return req.headers["x-internal-service-secret"] === expectedSecret;
};

const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (!["doctor", "patient"].includes(role)) {
      return res.status(400).json({
        message: "Role must be doctor or patient",
      });
    }

    const user = await registerUser({ username, email, password, role });

    res.status(201).json({
      message: "User created successfully",
      user: serializeUser(user),
    });
  } catch (error) {
    const isConflict = error.message && error.message.includes("already exists");
    res.status(isConflict ? 400 : 500).json({
      message: isConflict ? error.message : "Failed to register user",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const result = await loginUser({ email, password });

    res.status(200).json({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.token;
    const userId = req.user.userId;

    await logoutUser(userId, token);

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteMe = async (req, res) => {
  try {
    const userId = req.user.userId;

    await deleteUserAccount(userId);

    res.status(200).json({ message: "User account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteByEmailInternal = async (req, res) => {
  try {
    if (!hasValidInternalSecret(req)) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const result = await deleteUserByEmail(email);

    res.status(200).json({
      message: result.deleted
        ? "User account deleted successfully"
        : "No user found for the provided email",
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete user by email",
      error: error.message,
    });
  }
};

const requestLoginOtpController = async (req, res) => {
  try {
    const { identifier, role } = req.body;

    if (!identifier) {
      return res.status(400).json({ message: "Identifier is required" });
    }

    if (role && !["doctor", "patient", "admin"].includes(role)) {
      return res.status(400).json({
        message: "Role must be doctor, patient or admin",
      });
    }

    const result = await requestLoginOtp({ identifier, role });

    res.status(200).json({
      message: "OTP sent for login",
      ...result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const verifyLoginOtpController = async (req, res) => {
  try {
    const { identifier, otp, role } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({
        message: "Identifier and OTP are required",
      });
    }

    if (role && !["doctor", "patient", "admin"].includes(role)) {
      return res.status(400).json({
        message: "Role must be doctor, patient or admin",
      });
    }

    const result = await verifyLoginOtp({ identifier, otp, role });

    res.status(200).json({
      message: "OTP login successful",
      ...result,
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ message: "Identifier is required" });
    }

    const result = await requestPasswordResetOtp({ identifier });

    res.status(200).json({
      message: "OTP sent for password reset",
      ...result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({
        message: "Identifier, OTP and new password are required",
      });
    }

    await resetPasswordWithOtp({ identifier, otp, newPassword });

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const me = async (req, res) => {
  res.status(200).json({
    message: "Profile fetched successfully",
    user: req.fullUser,
  });
};

const stats = async (_req, res) => {
  try {
    const data = await getUserStats();

    res.status(200).json({
      message: "User statistics fetched successfully",
      ...data,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch user statistics",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  deleteMe,
  deleteByEmailInternal,
  me,
  stats,
  requestLoginOtpController,
  verifyLoginOtpController,
  forgotPassword,
  resetPassword,
};