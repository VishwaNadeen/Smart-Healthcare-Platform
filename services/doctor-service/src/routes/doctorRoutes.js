const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  getDoctorsForVerification,
  getDoctorVerificationByAuthUserIdInternal,
  updateDoctorVerification,
  uploadMyDoctorProfileImage,
  removeMyDoctorProfileImage,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  deleteMyDoctorProfile,
  getMyAvailability,
  updateMyAvailability,
} = require("../controllers/doctorController");

/*
  Public doctor signup route
*/
router.post("/", upload.single("profileImage"), createDoctor);

/*
  Protected current-user routes
  IMPORTANT: keep /me routes above /:id
*/
router.get("/me", authMiddleware.requireDoctorAuth, getMyDoctorProfile);
router.put("/me", authMiddleware.requireDoctorAuth, updateMyDoctorProfile);
router.post(
  "/me/profile-image",
  authMiddleware.requireDoctorAuth,
  upload.single("profileImage"),
  uploadMyDoctorProfileImage
);
router.delete(
  "/me/profile-image",
  authMiddleware.requireDoctorAuth,
  removeMyDoctorProfileImage
);
router.delete("/me", authMiddleware.requireDoctorAuth, deleteMyDoctorProfile);
router.get("/me/availability", authMiddleware.requireDoctorAuth, getMyAvailability);
router.put(
  "/me/availability",
  authMiddleware.requireDoctorAuth,
  updateMyAvailability
);

/*
  Admin routes
*/
router.get(
  "/admin/verifications",
  authMiddleware.requireAdminAuth,
  getDoctorsForVerification
);
router.put("/:id", authMiddleware.requireAdminAuth, updateDoctor);
router.delete("/:id", authMiddleware.requireAdminAuth, deleteDoctor);
router.patch(
  "/:id/verification",
  authMiddleware.requireAdminAuth,
  updateDoctorVerification
);
router.get(
  "/internal/auth-users/:authUserId/verification",
  getDoctorVerificationByAuthUserIdInternal
);

/*
  Public/general routes
*/
router.get("/", getAllDoctors);
router.get("/:id", getDoctorById);

module.exports = router;
