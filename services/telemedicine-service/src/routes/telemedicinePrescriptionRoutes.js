const express = require("express");
const router = express.Router();
const {
  createPrescription,
  getPrescriptionsByAppointmentId,
} = require("../controllers/telemedicinePrescriptionController");
const authMiddleware = require("../middleware/authMiddleware");
const sessionAccessMiddleware = require("../middleware/sessionAccessMiddleware");

router.get("/:appointmentId", authMiddleware, sessionAccessMiddleware, getPrescriptionsByAppointmentId);
router.post("/", authMiddleware, sessionAccessMiddleware, createPrescription);

module.exports = router;
