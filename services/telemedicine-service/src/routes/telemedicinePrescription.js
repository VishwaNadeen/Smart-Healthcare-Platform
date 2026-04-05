const express = require("express");
const router = express.Router();
const {
  createPrescription,
  getPrescriptionsByAppointmentId,
  updatePrescription,
  updateConsultationNotes,
} = require("../controllers/telemedicinePrescription");
const authMiddleware = require("../middleware/authMiddleware");
const sessionAccessMiddleware = require("../middleware/sessionAccessMiddleware");

router.get("/:appointmentId", authMiddleware, sessionAccessMiddleware, getPrescriptionsByAppointmentId);
router.patch(
  "/:appointmentId/notes",
  authMiddleware,
  sessionAccessMiddleware,
  updateConsultationNotes
);
router.patch("/:prescriptionId", authMiddleware, updatePrescription);
router.post("/", authMiddleware, sessionAccessMiddleware, createPrescription);

module.exports = router;
