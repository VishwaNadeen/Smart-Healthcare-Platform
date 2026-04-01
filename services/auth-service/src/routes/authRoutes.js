const express = require("express");
const router = express.Router();

const {
  register,
  login,
  logout,
  deleteMe,
  deleteByEmailInternal,
  updateDoctorApprovalStatusInternal,
  me,
  stats,
  requestEmailVerification,
  verifyEmail,
  requestLoginOtpController,
  verifyLoginOtpController,
  forgotPassword,
  resetPassword,
  verifyPassword,
} = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/verify-email/request", requestEmailVerification);
router.post("/verify-email/confirm", verifyEmail);
router.post("/login-otp/request", requestLoginOtpController);
router.post("/login-otp/verify", verifyLoginOtpController);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-password", authMiddleware, verifyPassword);
router.get("/stats", stats);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, me);
router.delete("/me", authMiddleware, deleteMe);
router.patch(
  "/doctor-approval/:authUserId",
  authMiddleware,
  roleMiddleware("admin"),
  updateDoctorApprovalStatusInternal
);

// internal route for cross-service rollback/cleanup
router.delete("/internal/users/by-email", deleteByEmailInternal);

router.get(
  "/doctor/dashboard",
  authMiddleware,
  roleMiddleware("doctor"),
  (req, res) => {
    res.status(200).json({
      message: "Welcome Doctor",
      user: req.fullUser,
    });
  }
);

router.get(
  "/patient/dashboard",
  authMiddleware,
  roleMiddleware("patient"),
  (req, res) => {
    res.status(200).json({
      message: "Welcome Patient",
      user: req.fullUser,
    });
  }
);

router.get(
  "/admin/dashboard",
  authMiddleware,
  roleMiddleware("admin"),
  (req, res) => {
    res.status(200).json({
      message: "Welcome Admin",
      user: req.fullUser,
    });
  }
);

module.exports = router;
