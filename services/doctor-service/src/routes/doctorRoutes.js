const express = require("express");
const {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  getDoctorsForVerification,
  updateDoctorVerification,
  getDoctorApprovalForAuthUserInternal,
  uploadMyDoctorProfileImage,
  removeMyDoctorProfileImage,
  deleteMyDoctorProfile,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  getMyAvailability,
  updateMyAvailability,
} = require("../controllers/doctorController");
const upload = require("../middleware/uploadMiddleware");
const {
  requireDoctorAuth,
  requireAdminAuth,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", upload.single("profileImage"), createDoctor);
router.get("/", getAllDoctors);
router.get(
  "/internal/auth-users/:authUserId/approval",
  getDoctorApprovalForAuthUserInternal
);
router.get("/admin/verifications", requireAdminAuth, getDoctorsForVerification);
router.get("/me", requireDoctorAuth, getMyDoctorProfile);
router.put("/me", requireDoctorAuth, updateMyDoctorProfile);
router.post(
  "/me/profile-image",
  requireDoctorAuth,
  upload.single("profileImage"),
  uploadMyDoctorProfileImage
);
router.delete("/me/profile-image", requireDoctorAuth, removeMyDoctorProfileImage);
router.delete("/me", requireDoctorAuth, deleteMyDoctorProfile);
router.get("/me/availability", requireDoctorAuth, getMyAvailability);
router.put("/me/availability", requireDoctorAuth, updateMyAvailability);
router.get("/:id", getDoctorById);
router.put("/:id", requireAdminAuth, updateDoctor);
router.patch("/:id/verification", requireAdminAuth, updateDoctorVerification);

module.exports = router;
