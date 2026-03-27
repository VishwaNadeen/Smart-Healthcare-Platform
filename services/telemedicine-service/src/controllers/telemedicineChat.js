const TelemedicineMessage = require("../models/telemedicineMessage");

exports.getMessagesByAppointmentId = async (req, res) => {
  try {
    const messages = await TelemedicineMessage.find({
      appointmentId: req.params.appointmentId,
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chat messages",
      error: error.message,
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { appointmentId, senderName, message } = req.body;

    if (!appointmentId || !message) {
      return res.status(400).json({
        success: false,
        message: "appointmentId and message are required",
      });
    }

    const newMessage = await TelemedicineMessage.create({
      appointmentId,
      senderRole: req.user.role,
      senderName: senderName || req.user.username || req.user.role,
      message,
    });

    return res.status(201).json({
      success: true,
      data: newMessage,
      message: "Message sent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};
