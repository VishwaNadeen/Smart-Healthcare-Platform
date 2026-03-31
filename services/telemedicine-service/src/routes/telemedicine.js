const express = require("express");
const router = express.Router();

const {
  createSession,
  createSessionInternal,
  getAllSessions,
  getSessionStats,
  getSessionById,
  getSessionByAppointmentId,
  getSessionsByDoctorId,
  getSessionsByPatientId,
  updateSessionStatus,
  updateSessionNotes,
} = require("../controllers/telemedicine");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/internal/session", createSessionInternal);

router.use(authMiddleware);

router.post("/", createSession);
router.get("/", getAllSessions);
router.get("/stats", getSessionStats);
router.get("/appointment/:appointmentId", getSessionByAppointmentId);
router.get("/doctor/:doctorId", getSessionsByDoctorId);
router.get("/patient/:patientId", getSessionsByPatientId);
router.patch("/appointment/:appointmentId/status", updateSessionStatus);
router.patch("/appointment/:appointmentId/notes", updateSessionNotes);
router.get("/:id", getSessionById);

module.exports = router;
