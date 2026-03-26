const express = require("express");
const router = express.Router();
const {
  createPrescription,
  getPrescriptionsByAppointmentId,
} = require("../controllers/telemedicinePrescriptionController");

router.get("/:appointmentId", getPrescriptionsByAppointmentId);
router.post("/", createPrescription);

module.exports = router;