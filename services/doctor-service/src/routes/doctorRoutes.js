const express = require("express");
<<<<<<< Updated upstream

const {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} = require("../controllers/doctorController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", createDoctor);
router.get("/", getAllDoctors);
router.get("/:id", getDoctorById);
router.put("/:id", requireAuth, updateDoctor);
router.delete("/:id", requireAuth, deleteDoctor);
=======
const router = express.Router();
const {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  updateAvailability,
  updateStatus,
  deleteDoctor
} = require("../controllers/doctorController");

router.post("/", createDoctor);
router.get("/", getDoctors);
router.get("/:id", getDoctorById);
router.put("/:id", updateDoctor);
router.patch("/:id/availability", updateAvailability);
router.patch("/:id/status", updateStatus);
router.delete("/:id", deleteDoctor);
>>>>>>> Stashed changes

module.exports = router;