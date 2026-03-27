const express = require("express");
const {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  getMyAvailability,
  updateMyAvailability,
} = require("../controllers/doctorController");
const {
  requireAuth,
  requireDoctorAuth,
  enforceDoctorResourceOwnership,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", createDoctor);
router.get("/", getAllDoctors);
router.get("/me", requireDoctorAuth, getMyDoctorProfile);
router.put("/me", requireDoctorAuth, updateMyDoctorProfile);
router.get("/me/availability", requireDoctorAuth, getMyAvailability);
router.put("/me/availability", requireDoctorAuth, updateMyAvailability);
router.get("/:id", getDoctorById);
router.put("/:id", requireAuth, enforceDoctorResourceOwnership, updateDoctor);
router.delete("/:id", requireAuth, enforceDoctorResourceOwnership, deleteDoctor);

module.exports = router;
