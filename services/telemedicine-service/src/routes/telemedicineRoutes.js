const express = require("express");
const router = express.Router();

const {
  createSession,
  getAllSessions,
  getSessionById,
  getSessionByAppointmentId,
  updateSessionStatus,
  updateSessionNotes,
} = require("../controllers/telemedicineController");

router.post("/", createSession);
router.get("/", getAllSessions);
router.get("/appointment/:appointmentId", getSessionByAppointmentId);
router.get("/:id", getSessionById);
router.patch("/:id/status", updateSessionStatus);
router.patch("/:id/notes", updateSessionNotes);

module.exports = router;