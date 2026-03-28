const express = require("express");
const {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  getDoctorsForVerification,
  updateDoctorVerification,
  deleteMyDoctorProfile,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  getMyAvailability,
  updateMyAvailability,
} = require("../controllers/doctorController");
const {
  requireDoctorAuth,
  requireAdminAuth,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", createDoctor);
router.get("/", getAllDoctors);
router.get("/admin/verifications", requireAdminAuth, getDoctorsForVerification);
router.get("/me", requireDoctorAuth, getMyDoctorProfile);
router.put("/me", requireDoctorAuth, updateMyDoctorProfile);
router.delete("/me", requireDoctorAuth, deleteMyDoctorProfile);
router.get("/me/availability", requireDoctorAuth, getMyAvailability);
router.put("/me/availability", requireDoctorAuth, updateMyAvailability);
router.get("/:id", getDoctorById);
router.put("/:id", requireAdminAuth, updateDoctor);
router.patch("/:id/verification", requireAdminAuth, updateDoctorVerification);

module.exports = router;
