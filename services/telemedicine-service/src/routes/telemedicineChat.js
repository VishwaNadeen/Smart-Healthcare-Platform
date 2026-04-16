const express = require("express");
const router = express.Router();
const {
  getMessagesByAppointmentId,
  sendMessage,
  heartbeatPresence,
  disconnectPresence,
} = require("../controllers/telemedicineChat");
const authMiddleware = require("../middleware/authMiddleware");
const sessionAccessMiddleware = require("../middleware/sessionAccessMiddleware");

router.get("/:appointmentId", authMiddleware, sessionAccessMiddleware, getMessagesByAppointmentId);
router.post(
  "/:appointmentId/presence/heartbeat",
  authMiddleware,
  sessionAccessMiddleware,
  heartbeatPresence
);
router.post(
  "/:appointmentId/presence/disconnect",
  authMiddleware,
  sessionAccessMiddleware,
  disconnectPresence
);
router.post("/", authMiddleware, sessionAccessMiddleware, sendMessage);

module.exports = router;
