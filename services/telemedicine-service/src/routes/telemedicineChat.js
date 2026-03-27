const express = require("express");
const router = express.Router();
const {
  getMessagesByAppointmentId,
  sendMessage,
} = require("../controllers/telemedicineChat");
const authMiddleware = require("../middleware/authMiddleware");
const sessionAccessMiddleware = require("../middleware/sessionAccessMiddleware");

router.get("/:appointmentId", authMiddleware, sessionAccessMiddleware, getMessagesByAppointmentId);
router.post("/", authMiddleware, sessionAccessMiddleware, sendMessage);

module.exports = router;
