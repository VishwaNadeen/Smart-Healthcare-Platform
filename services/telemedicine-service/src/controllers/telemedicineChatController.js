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
    const { appointmentId, senderRole, senderName, message } = req.body;

    const newMessage = await TelemedicineMessage.create({
      appointmentId,
      senderRole,
      senderName,
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