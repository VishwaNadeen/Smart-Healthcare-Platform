const TelemedicineSession = require("../models/telemedicineSession");
const { getAppointmentById } = require("../services/appointmentService");

const createSession = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        message: "Only doctors can create telemedicine sessions",
      });
    }

    const { appointmentId, scheduledDate, scheduledTime } = req.body || {};

    if (!appointmentId) {
      return res.status(400).json({
        message: "appointmentId is required",
      });
    }

    const existingSession = await TelemedicineSession.findOne({ appointmentId });
    if (existingSession) {
      return res.status(400).json({
        message: "Session already exists for this appointment",
      });
    }

    const appointment = await getAppointmentById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    if (String(appointment.doctorId) !== String(req.user.userId)) {
      return res.status(403).json({
        message: "You can create sessions only for your own appointments",
      });
    }

    if (!["confirmed", "pending"].includes(appointment.status)) {
      return res.status(400).json({
        message: "Telemedicine session can only be created for pending or confirmed appointments",
      });
    }

    const resolvedScheduledDate = scheduledDate || appointment.appointmentDate;
    const resolvedScheduledTime = scheduledTime || appointment.appointmentTime;

    if (!appointment.patientId || !appointment.doctorId || !resolvedScheduledDate || !resolvedScheduledTime) {
      return res.status(400).json({
        message: "The linked appointment is missing patient, doctor, date or time details",
      });
    }

    if (
      scheduledDate &&
      appointment.appointmentDate &&
      String(appointment.appointmentDate) !== String(scheduledDate)
    ) {
      return res.status(400).json({
        message: "Scheduled date does not match the appointment date",
      });
    }

    if (
      scheduledTime &&
      appointment.appointmentTime &&
      String(appointment.appointmentTime) !== String(scheduledTime)
    ) {
      return res.status(400).json({
        message: "Scheduled time does not match the appointment time",
      });
    }

    const roomName = `healthcare-${appointmentId}`;
    const meetingLink = `https://meet.jit.si/${roomName}`;

    const session = await TelemedicineSession.create({
      appointmentId,
      patientId: String(appointment.patientId),
      doctorId: String(appointment.doctorId),
      roomName,
      meetingLink,
      scheduledDate: resolvedScheduledDate,
      scheduledTime: resolvedScheduledTime,
      status: "scheduled",
    });

    return res.status(201).json({
      message: "Telemedicine session created successfully",
      session,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: "Failed to create session",
      error: error.message,
    });
  }
};

const getAllSessions = async (req, res) => {
  try {
    const query = req.user.role === "doctor"
      ? { doctorId: String(req.user.userId) }
      : { patientId: String(req.user.userId) };

    const sessions = await TelemedicineSession.find(query).sort({ createdAt: -1 });
    return res.status(200).json(sessions);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch sessions",
      error: error.message,
    });
  }
};

const getSessionStats = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        message: "Only doctors can view telemedicine statistics",
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const doctorId = String(req.user.userId);

    const [totalSessions, activeSessions, completedSessions, cancelledSessions, todaySessions] = await Promise.all([
      TelemedicineSession.countDocuments({ doctorId }),
      TelemedicineSession.countDocuments({ doctorId, status: "active" }),
      TelemedicineSession.countDocuments({ doctorId, status: "completed" }),
      TelemedicineSession.countDocuments({ doctorId, status: "cancelled" }),
      TelemedicineSession.countDocuments({ doctorId, scheduledDate: today }),
    ]);

    return res.status(200).json({
      totalSessions,
      activeSessions,
      completedSessions,
      cancelledSessions,
      todaySessions,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch telemedicine statistics",
      error: error.message,
    });
  }
};

const getSessionById = async (req, res) => {
  try {
    const session = await TelemedicineSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    const currentUserId = String(req.user.userId);
    const allowed =
      (req.user.role === "doctor" && String(session.doctorId) === currentUserId) ||
      (req.user.role === "patient" && String(session.patientId) === currentUserId);

    if (!allowed) {
      return res.status(403).json({
        message: "You do not have access to this session",
      });
    }

    return res.status(200).json(session);
  } catch (error) {
    return res.status(500).json({
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
      return res.status(404).json({
        message: "Session not found",
      });
    }

    const currentUserId = String(req.user.userId);
    const allowed =
      (req.user.role === "doctor" && String(session.doctorId) === currentUserId) ||
      (req.user.role === "patient" && String(session.patientId) === currentUserId);

    if (!allowed) {
      return res.status(403).json({
        message: "You do not have access to this session",
      });
    }

    return res.status(200).json(session);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch session",
      error: error.message,
    });
  }
};

const getSessionsByDoctorId = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        message: "Only doctors can view doctor session lists",
      });
    }

    if (String(req.params.doctorId) !== String(req.user.userId)) {
      return res.status(403).json({
        message: "You can only view your own sessions",
      });
    }

    const sessions = await TelemedicineSession.find({
      doctorId: req.params.doctorId,
    }).sort({ createdAt: -1 });

    return res.status(200).json(sessions);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch doctor sessions",
      error: error.message,
    });
  }
};

const getSessionsByPatientId = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        message: "Only patients can view patient session lists",
      });
    }

    if (String(req.params.patientId) !== String(req.user.userId)) {
      return res.status(403).json({
        message: "You can only view your own sessions",
      });
    }

    const sessions = await TelemedicineSession.find({
      patientId: req.params.patientId,
    }).sort({ createdAt: -1 });

    return res.status(200).json(sessions);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch patient sessions",
      error: error.message,
    });
  }
};

const updateSessionStatus = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        message: "Only doctors can update session status",
      });
    }

    const { status } = req.body;
    const validStatuses = ["scheduled", "active", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const updatedSession = await TelemedicineSession.findOneAndUpdate(
      {
        appointmentId: req.params.appointmentId,
        doctorId: String(req.user.userId),
      },
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedSession) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    return res.status(200).json({
      message: "Session status updated successfully",
      session: updatedSession,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update session status",
      error: error.message,
    });
  }
};

const updateSessionNotes = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        message: "Only doctors can update session notes",
      });
    }

    const { notes } = req.body;

    const updatedSession = await TelemedicineSession.findOneAndUpdate(
      {
        appointmentId: req.params.appointmentId,
        doctorId: String(req.user.userId),
      },
      { notes: String(notes || "") },
      { new: true, runValidators: true }
    );

    if (!updatedSession) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    return res.status(200).json({
      message: "Session notes updated successfully",
      session: updatedSession,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update session notes",
      error: error.message,
    });
  }
};

module.exports = {
  createSession,
  getAllSessions,
  getSessionStats,
  getSessionById,
  getSessionByAppointmentId,
  getSessionsByDoctorId,
  getSessionsByPatientId,
  updateSessionStatus,
  updateSessionNotes,
};
