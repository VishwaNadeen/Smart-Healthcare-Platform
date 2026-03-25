const TelemedicineSession = require("../models/telemedicineModel");

const createSession = async (req, res) => {
  try {
    const {
      appointmentId,
      patientId,
      doctorId,
      scheduledDate,
      scheduledTime,
    } = req.body;

    const roomName = `healthcare-${appointmentId}`;
    const meetingLink = `https://meet.jit.si/${roomName}`;

    const session = await TelemedicineSession.create({
      appointmentId,
      patientId,
      doctorId,
      roomName,
      meetingLink,
      scheduledDate,
      scheduledTime,
    });

    res.status(201).json({
      message: "Telemedicine session created successfully",
      session,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create session",
      error: error.message,
    });
  }
};

const getAllSessions = async (req, res) => {
  try {
    const sessions = await TelemedicineSession.find().sort({ createdAt: -1 });
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch sessions",
      error: error.message,
    });
  }
};

const getSessionById = async (req, res) => {
  try {
    const session = await TelemedicineSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch session",
      error: error.message,
    });
  }
};

const getSessionByAppointmentId = async (req, res) => {
  try {
    const session = await TelemedicineSession.findOne({
      appointmentId: req.params.appointmentId,
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch session",
      error: error.message,
    });
  }
};

const updateSessionStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["scheduled", "active", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const session = await TelemedicineSession.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.status(200).json({
      message: "Session status updated successfully",
      session,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update session status",
      error: error.message,
    });
  }
};

const updateSessionNotes = async (req, res) => {
  try {
    const { notes } = req.body;

    const session = await TelemedicineSession.findByIdAndUpdate(
      req.params.id,
      { notes },
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.status(200).json({
      message: "Session notes updated successfully",
      session,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update session notes",
      error: error.message,
    });
  }
};

module.exports = {
  createSession,
  getAllSessions,
  getSessionById,
  getSessionByAppointmentId,
  updateSessionStatus,
  updateSessionNotes,
};