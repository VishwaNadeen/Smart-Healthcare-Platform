const express = require("express");
const router = express.Router();

const {
  register,
  login,
  logout,
  deleteMe,
  deleteByEmailInternal,
  updateDoctorApprovalStatusInternal,
  getUserByIdInternal,
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
const validate = require("../middlewares/validate");

const {
  registerSchema,
  loginSchema,
  requestEmailVerificationSchema,
  verifyEmailSchema,
  requestLoginOtpSchema,
  verifyLoginOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyPasswordSchema,
  deleteByEmailInternalSchema,
} = require("../validations/authValidation");

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post(
  "/verify-email/request",
  validate(requestEmailVerificationSchema),
  requestEmailVerification
);
router.post("/verify-email/confirm", validate(verifyEmailSchema), verifyEmail);
router.post(
  "/login-otp/request",
  validate(requestLoginOtpSchema),
  requestLoginOtpController
);
router.post(
  "/login-otp/verify",
  validate(verifyLoginOtpSchema),
  verifyLoginOtpController
);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post(
  "/verify-password",
  authMiddleware,
  validate(verifyPasswordSchema),
  verifyPassword
);

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
router.delete(
  "/internal/users/by-email",
  validate(deleteByEmailInternalSchema),
  deleteByEmailInternal
);
router.get("/internal/users/:id", getUserByIdInternal);

router.get("/internal/users/:id", getUserByIdInternal);

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
