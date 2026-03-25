const express = require("express");
const router = express.Router();

const {
  createSession,
  getAllSessions,
  getSessionById,
  getSessionByAppointmentId,
  getSessionsByDoctorId,
  getSessionsByPatientId,
  updateSessionStatus,
  updateSessionNotes,
} = require("../controllers/telemedicineController");

router.post("/", createSession);
router.get("/", getAllSessions);
router.get("/appointment/:appointmentId", getSessionByAppointmentId);
router.get("/doctor/:doctorId", getSessionsByDoctorId);
router.get("/patient/:patientId", getSessionsByPatientId);
router.get("/:id", getSessionById);
router.patch("/:id/status", updateSessionStatus);
router.patch("/:id/notes", updateSessionNotes);

module.exports = router;