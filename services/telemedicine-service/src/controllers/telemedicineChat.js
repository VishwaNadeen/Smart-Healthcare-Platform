const TelemedicineMessage = require("../models/telemedicineMessage");

const PRESENCE_TIMEOUT_MS = 15000;
const SYSTEM_CONNECTED_MESSAGE = "Consultation chat started.";

const isRoleConnected = (presence, now = new Date()) => {
  if (!presence?.lastSeenAt) {
    return false;
  }

  const lastSeenAt = new Date(presence.lastSeenAt);
  return now.getTime() - lastSeenAt.getTime() <= PRESENCE_TIMEOUT_MS;
};

const getPresenceState = (session, now = new Date()) => {
  const doctorConnected = isRoleConnected(session?.presence?.doctor, now);
  const patientConnected = isRoleConnected(session?.presence?.patient, now);

  return {
    doctorConnected,
    patientConnected,
    bothConnected: doctorConnected && patientConnected,
  };
};

const createSystemConnectedMessage = async (appointmentId, now = new Date()) => {
  const duplicateWindowStart = new Date(now.getTime() - 30000);
  const existingMessage = await TelemedicineMessage.findOne({
    appointmentId,
    senderRole: "system",
    message: SYSTEM_CONNECTED_MESSAGE,
    createdAt: { $gte: duplicateWindowStart },
  }).sort({ createdAt: -1 });

  if (existingMessage) {
    return existingMessage;
  }

  return TelemedicineMessage.create({
    appointmentId,
    senderRole: "system",
    senderId: "",
    senderName: "System",
    message: SYSTEM_CONNECTED_MESSAGE,
  });
};

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
      senderId: req.user.userId,
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

exports.heartbeatPresence = async (req, res) => {
  try {
    const session = req.session;
    const role = req.user.role;
    const now = new Date();
    const previousPresence = getPresenceState(session, now);

    if (!session.presence) {
      session.presence = {};
    }

    const currentPresence = session.presence[role] || {};

    if (!isRoleConnected(currentPresence, now)) {
      currentPresence.connectedAt = now;
    }

    currentPresence.userId = req.user.userId;
    currentPresence.lastSeenAt = now;
    session.presence[role] = currentPresence;

    await session.save();

    const updatedPresence = getPresenceState(session, now);

    if (!previousPresence.bothConnected && updatedPresence.bothConnected) {
      await createSystemConnectedMessage(session.appointmentId, now);
    }

    return res.status(200).json({
      success: true,
      data: updatedPresence,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update session presence",
      error: error.message,
    });
  }
};

exports.disconnectPresence = async (req, res) => {
  try {
    const session = req.session;
    const role = req.user.role;

    if (!session.presence) {
      session.presence = {};
    }

    session.presence[role] = {
      userId: req.user.userId,
      connectedAt: session.presence[role]?.connectedAt || null,
      lastSeenAt: null,
    };

    await session.save();

    return res.status(200).json({
      success: true,
      data: getPresenceState(session),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to disconnect session presence",
      error: error.message,
    });
  }
};
