const TelemedicineSession = require("../models/telemedicineSession");
const { getAppointmentById } = require("../services/appointmentService");

const createSession = async (req, res) => {
  try {
    const {
      appointmentId,
      patientId,
      doctorId,
      scheduledDate,
      scheduledTime,
    } = req.body || {};

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

    const resolvedPatientId = patientId || appointment.patientId;
    const resolvedDoctorId = doctorId || appointment.doctorId;
    const resolvedScheduledDate = scheduledDate || appointment.appointmentDate;
    const resolvedScheduledTime = scheduledTime || appointment.appointmentTime;

    if (
      !resolvedPatientId ||
      !resolvedDoctorId ||
      !resolvedScheduledDate ||
      !resolvedScheduledTime
    ) {
      return res.status(400).json({
        message:
          "The linked appointment is missing patient, doctor, date or time details",
      });
    }

    if (
      patientId &&
      String(appointment.patientId) !== String(patientId)
    ) {
      return res.status(400).json({
        message: "Patient does not match the appointment",
      });
    }

    if (doctorId && String(appointment.doctorId) !== String(doctorId)) {
      return res.status(400).json({
        message: "Doctor does not match the appointment",
      });
    }

    if (!["confirmed", "pending"].includes(appointment.status)) {
      return res.status(400).json({
        message: "Telemedicine session can only be created for pending or confirmed appointments",
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
      patientId: resolvedPatientId,
      doctorId: resolvedDoctorId,
      roomName,
      meetingLink,
      scheduledDate: resolvedScheduledDate,
      scheduledTime: resolvedScheduledTime,
    });

    res.status(201).json({
      message: "Telemedicine session created successfully",
      session,
    });
  } catch (error) {
    res.status(error.status || 500).json({
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

const getSessionStats = async (_req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [
      totalSessions,
      activeSessions,
      completedSessions,
      cancelledSessions,
      todaySessions,
    ] = await Promise.all([
      TelemedicineSession.countDocuments(),
      TelemedicineSession.countDocuments({ status: "active" }),
      TelemedicineSession.countDocuments({ status: "completed" }),
      TelemedicineSession.countDocuments({ status: "cancelled" }),
      TelemedicineSession.countDocuments({ scheduledDate: today }),
    ]);

    res.status(200).json({
      totalSessions,
      activeSessions,
      completedSessions,
      cancelledSessions,
      todaySessions,
    });
  } catch (error) {
    res.status(500).json({
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
      return res.status(404).json({
        message: "Session not found",
      });
    }

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch session",
      error: error.message,
    });
  }
};

const getSessionsByDoctorId = async (req, res) => {
  try {
    const sessions = await TelemedicineSession.find({
      doctorId: req.params.doctorId,
    }).sort({ createdAt: -1 });

    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch doctor sessions",
      error: error.message,
    });
  }
};

const getSessionsByPatientId = async (req, res) => {
  try {
    const sessions = await TelemedicineSession.find({
      patientId: req.params.patientId,
    }).sort({ createdAt: -1 });

    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch patient sessions",
      error: error.message,
    });
  }
};

const updateSessionStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["scheduled", "active", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const updatedSession = await TelemedicineSession.findOneAndUpdate(
      { appointmentId: req.params.appointmentId },
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedSession) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    res.status(200).json({
      message: "Session status updated successfully",
      session: updatedSession,
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

    const updatedSession = await TelemedicineSession.findOneAndUpdate(
      { appointmentId: req.params.appointmentId },
      { notes },
      { new: true, runValidators: true }
    );

    if (!updatedSession) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    res.status(200).json({
      message: "Session notes updated successfully",
      session: updatedSession,
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
  getSessionStats,
  getSessionById,
  getSessionByAppointmentId,
  getSessionsByDoctorId,
  getSessionsByPatientId,
  updateSessionStatus,
  updateSessionNotes,
};
