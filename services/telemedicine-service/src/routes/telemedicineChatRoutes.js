const express = require("express");
const router = express.Router();
const {
  getMessagesByAppointmentId,
  sendMessage,
} = require("../controllers/telemedicineChatController");

router.get("/:appointmentId", getMessagesByAppointmentId);
router.post("/", sendMessage);

module.exports = router;