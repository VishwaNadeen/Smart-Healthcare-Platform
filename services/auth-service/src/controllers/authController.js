const {
  registerUser,
  loginUser,
  logoutUser,
  requestLoginOtp,
  verifyLoginOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp
} = require("../services/authService");

const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["doctor", "patient"].includes(role)) {
      return res.status(400).json({ message: "Role must be doctor or patient" });
    }

    const user = await registerUser({ username, email, password, role });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const result = await loginUser({ username, password, role });

    res.status(200).json({
      message: "Login successful",
      ...result
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

const requestLoginOtpController = async (req, res) => {
  try {
    const { identifier, role } = req.body;

    if (!identifier) {
      return res.status(400).json({ message: "Identifier is required" });
    }

    const result = await requestLoginOtp({ identifier, role });

    res.status(200).json({
      message: "OTP sent for login",
      ...result
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const verifyLoginOtpController = async (req, res) => {
  try {
    const { identifier, otp, role } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ message: "Identifier and OTP are required" });
    }

    const result = await verifyLoginOtp({ identifier, otp, role });

    res.status(200).json({
      message: "OTP login successful",
      ...result
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
      ...result
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ message: "Identifier, OTP and new password are required" });
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
    user: req.fullUser
  });
};

module.exports = {
  register,
  login,
  logout,
  me,
  requestLoginOtpController,
  verifyLoginOtpController,
  forgotPassword,
  resetPassword
};