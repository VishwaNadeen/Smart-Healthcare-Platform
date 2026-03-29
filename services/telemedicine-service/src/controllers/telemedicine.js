const TelemedicineSession = require("../models/telemedicineSession");
const {
  getAppointmentById,
  updateAppointmentStatus,
} = require("../services/appointmentService");

const SESSION_STATUSES = ["scheduled", "active", "completed", "cancelled"];
const SESSION_TO_APPOINTMENT_STATUS_MAP = {
  scheduled: null,
  active: "confirmed",
  completed: "completed",
  cancelled: "cancelled",
};

const hasValidInternalSecret = (req) => {
  const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;

  if (!expectedSecret) {
    return true;
  }

  return req.headers["x-internal-service-secret"] === expectedSecret;
};

const getDoctorIdentityValues = (req) => {
  return [...new Set([
    String(req.user?.userId || ""),
    String(req.user?.doctorProfileId || ""),
  ].filter(Boolean))];
};

const createSessionRecord = async ({
  appointmentId,
  patientId,
  doctorId,
  scheduledDate,
  scheduledTime,
}) => {
  const roomName = `healthcare-${appointmentId}`;
  const meetingLink = `https://meet.jit.si/${roomName}`;

  return TelemedicineSession.create({
    appointmentId: String(appointmentId),
    patientId: String(patientId),
    doctorId: String(doctorId),
    roomName,
    meetingLink,
    scheduledDate: String(scheduledDate),
    scheduledTime: String(scheduledTime),
    status: "scheduled",
  });
};

const authorizeSessionAccess = (req, session) => {
  const currentUserId = String(req.user.userId);
  const doctorIds = getDoctorIdentityValues(req);

  return (
    (req.user.role === "doctor" &&
      doctorIds.includes(String(session.doctorId))) ||
    (req.user.role === "patient" && String(session.patientId) === currentUserId)
  );
};

const createSession = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        message: "Only doctors can create telemedicine sessions",
      });
    }

    const { appointmentId, patientId, scheduledDate, scheduledTime } = req.body || {};

    if (!appointmentId || !patientId || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        message: "appointmentId, patientId, scheduledDate and scheduledTime are required",
      });
    }

    const existingSession = await TelemedicineSession.findOne({
      appointmentId: String(appointmentId),
    });

    if (existingSession) {
      return res.status(400).json({
        message: "Session already exists for this appointment",
      });
    }

    const appointmentResponse = await getAppointmentById(appointmentId);
    const appointment = appointmentResponse?.appointment;
    const doctorIds = getDoctorIdentityValues(req);

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    if (!doctorIds.includes(String(appointment.doctorId))) {
      return res.status(403).json({
        message: "You can only create sessions for your own appointments",
      });
    }

    if (String(appointment.patientId) !== String(patientId)) {
      return res.status(400).json({
        message: "Provided patientId does not match the appointment",
      });
    }

    if (!["pending", "confirmed"].includes(String(appointment.status))) {
      return res.status(409).json({
        message: `Cannot create a telemedicine session for a ${appointment.status} appointment`,
      });
    }

    const session = await createSessionRecord({
      appointmentId,
      patientId,
      doctorId: appointment.doctorId,
      scheduledDate,
      scheduledTime,
    });

    return res.status(201).json({
      message: "Telemedicine session created successfully",
      session,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Failed to create session",
      error: error.message,
    });
  }
};

const createSessionInternal = async (req, res) => {
  try {
    if (!hasValidInternalSecret(req)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { appointmentId } = req.body || {};

    if (!appointmentId) {
      return res.status(400).json({
        message: "appointmentId is required",
      });
    }

    const normalizedAppointmentId = String(appointmentId);

    const existingSession = await TelemedicineSession.findOne({
      appointmentId: normalizedAppointmentId,
    });

    if (existingSession) {
      return res.status(200).json({
        message: "Telemedicine session already exists",
        session: existingSession,
      });
    }

    const appointmentResponse = await getAppointmentById(normalizedAppointmentId);
    const appointment = appointmentResponse?.appointment;

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    if (
      !appointment.patientId ||
      !appointment.doctorId ||
      !appointment.appointmentDate ||
      !appointment.appointmentTime
    ) {
      return res.status(400).json({
        message: "Appointment is missing required telemedicine fields",
      });
    }

    if (!["pending", "confirmed"].includes(String(appointment.status))) {
      return res.status(409).json({
        message: `Cannot create a telemedicine session for a ${appointment.status} appointment`,
      });
    }

    const session = await createSessionRecord({
      appointmentId: normalizedAppointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      scheduledDate: appointment.appointmentDate,
      scheduledTime: appointment.appointmentTime,
    });

    return res.status(201).json({
      message: "Telemedicine session created successfully",
      session,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Failed to create session",
      error: error.message,
    });
  }
};

const getAllSessions = async (req, res) => {
  try {
    const doctorIds = getDoctorIdentityValues(req);
    const query =
      req.user.role === "doctor"
        ? { doctorId: { $in: doctorIds } }
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
    const doctorIds = getDoctorIdentityValues(req);

    const [
      totalSessions,
      activeSessions,
      completedSessions,
      cancelledSessions,
      todaySessions,
    ] = await Promise.all([
      TelemedicineSession.countDocuments({ doctorId: { $in: doctorIds } }),
      TelemedicineSession.countDocuments({
        doctorId: { $in: doctorIds },
        status: "active",
      }),
      TelemedicineSession.countDocuments({
        doctorId: { $in: doctorIds },
        status: "completed",
      }),
      TelemedicineSession.countDocuments({
        doctorId: { $in: doctorIds },
        status: "cancelled",
      }),
      TelemedicineSession.countDocuments({
        doctorId: { $in: doctorIds },
        scheduledDate: today,
      }),
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
      return res.status(404).json({ message: "Session not found" });
    }

    if (!authorizeSessionAccess(req, session)) {
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
      return res.status(404).json({ message: "Session not found" });
    }

    if (!authorizeSessionAccess(req, session)) {
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

    const requestedDoctorId = String(req.params.doctorId);
    const doctorIds = getDoctorIdentityValues(req);

    if (!doctorIds.includes(requestedDoctorId)) {
      return res.status(403).json({
        message: "You can only view your own sessions",
      });
    }

    const sessions = await TelemedicineSession.find({
      doctorId: { $in: doctorIds },
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

    if (!SESSION_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const session = await TelemedicineSession.findOne({
      appointmentId: req.params.appointmentId,
      doctorId: { $in: getDoctorIdentityValues(req) },
    });

    if (!session) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    session.status = status;
    await session.save();

    const mappedAppointmentStatus = SESSION_TO_APPOINTMENT_STATUS_MAP[status];

    if (mappedAppointmentStatus) {
      await updateAppointmentStatus(
        req.params.appointmentId,
        mappedAppointmentStatus,
        `Synced from telemedicine session status: ${status}`
      );
    }

    return res.status(200).json({
      message: "Session status updated successfully",
      session,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Failed to update session status",
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
        doctorId: { $in: getDoctorIdentityValues(req) },
      },
      {
        notes: String(notes || ""),
      },
      {
        new: true,
        runValidators: true,
      }
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
  createSessionInternal,
  getAllSessions,
  getSessionStats,
  getSessionById,
  getSessionByAppointmentId,
  getSessionsByDoctorId,
  getSessionsByPatientId,
  updateSessionStatus,
  updateSessionNotes,
};
