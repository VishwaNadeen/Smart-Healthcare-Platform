const express = require("express");

const {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} = require("../controllers/doctorController");
const { requireDoctorAuth, enforceDoctorRecordOwnership } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", createDoctor);
router.get("/", getAllDoctors);
router.get("/:id", getDoctorById);
router.put("/:id", requireDoctorAuth, enforceDoctorRecordOwnership, updateDoctor);
router.delete("/:id", requireDoctorAuth, enforceDoctorRecordOwnership, deleteDoctor);

module.exports = router;