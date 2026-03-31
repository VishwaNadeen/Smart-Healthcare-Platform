const {
  registerUser,
  loginUser,
  logoutUser,
  deleteUserAccount,
  deleteUserByEmail,
  requestEmailVerificationOtp,
  verifyEmailOtp,
  requestLoginOtp,
  verifyLoginOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifyCurrentUserPassword,
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
  let createdUser = null;

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
    createdUser = user;
    const verification = await requestEmailVerificationOtp({ email });

    res.status(201).json({
      message: "User created successfully. Please verify your email to continue.",
      user: serializeUser(user),
      verificationRequired: !verification.alreadyVerified,
      expiresInMinutes: verification.expiresInMinutes,
    });
  } catch (error) {
    if (createdUser?._id) {
      try {
        await deleteUserAccount(createdUser._id);
      } catch (rollbackError) {
        console.error("Failed to roll back auth user after register error:", rollbackError.message);
      }
    }

    const errorMessage = error.message || "Failed to register user";
    const isConflict = errorMessage.includes("already exists");
    const isValidationOrConfigError =
      errorMessage.includes("SMTP is not configured") ||
      errorMessage.includes("Username is required") ||
      errorMessage.includes("All fields are required") ||
      errorMessage.includes("Role must be");

    res.status(isConflict || isValidationOrConfigError ? 400 : 500).json({
      message: errorMessage,
      error: errorMessage,
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
    const isInvalidCredentials =
      error.message === "Invalid email or password" ||
      error.message === "Please verify your email before logging in";

    res.status(isInvalidCredentials ? 401 : 500).json({
      message: isInvalidCredentials ? error.message : "Failed to login",
      error: error.message,
    });
  }
};

const requestEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const result = await requestEmailVerificationOtp({ email });

    res.status(200).json({
      message: result.alreadyVerified
        ? "Email is already verified"
        : "Verification code sent successfully",
      ...result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const result = await verifyEmailOtp({ email, otp });

    res.status(200).json({
      message: result.alreadyVerified
        ? "Email is already verified"
        : "Email verified successfully",
      ...result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
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
      expiresInMinutes: result.expiresInMinutes,
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
    const email = typeof req.body?.email === "string" ? req.body.email : req.body?.identifier;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const result = await requestPasswordResetOtp({ identifier: email });

    res.status(200).json({
      message: "OTP sent for password reset",
      expiresInMinutes: result.expiresInMinutes,
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

const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    await verifyCurrentUserPassword({
      userId: req.user.userId,
      password,
    });

    res.status(200).json({
      message: "Password verified successfully",
      verified: true,
    });
  } catch (error) {
    const message = error.message || "Failed to verify password";

    res.status(message === "Incorrect password" ? 401 : 400).json({
      message,
      error: message,
    });
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
  requestEmailVerification,
  verifyEmail,
  requestLoginOtpController,
  verifyLoginOtpController,
  forgotPassword,
  resetPassword,
  verifyPassword,
};
