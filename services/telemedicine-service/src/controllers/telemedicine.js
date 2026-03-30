const TelemedicineSession = require("../models/telemedicineSession");
const {
  getAppointmentById,
  updateAppointmentStatus,
} = require("../services/appointmentService");
const { getAuthUserById } = require("../services/authProfileService");

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
  return [
    ...new Set(
      [String(req.user?.userId || ""), String(req.user?.doctorProfileId || "")]
        .filter(Boolean)
    ),
  ];
};

const ROOM_NAME_PREFIX = "rn";
const ROOM_NAME_SEQUENCE_WIDTH = 4;

const escapeForRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getRoomNamePrefixForDate = (scheduledDate) =>
  `${ROOM_NAME_PREFIX}-${String(scheduledDate).trim()}`;

const getNextRoomSequenceForDate = async (scheduledDate) => {
  const roomNamePrefix = getRoomNamePrefixForDate(scheduledDate);
  const roomNamePattern = new RegExp(`^${escapeForRegex(roomNamePrefix)}-\\d+$`);

  const latestSession = await TelemedicineSession.findOne({
    roomName: { $regex: roomNamePattern },
  })
    .sort({ roomName: -1 })
    .select("roomName")
    .lean();

  const latestSequence = Number(
    String(latestSession?.roomName || "")
      .split("-")
      .pop()
  );

  return Number.isInteger(latestSequence) ? latestSequence + 1 : 1;
};

const buildRoomName = (scheduledDate, sequenceNumber) => {
  const roomNamePrefix = getRoomNamePrefixForDate(scheduledDate);
  const paddedSequence = String(sequenceNumber).padStart(
    ROOM_NAME_SEQUENCE_WIDTH,
    "0"
  );

  return `${roomNamePrefix}-${paddedSequence}`;
};

const createSessionRecord = async ({
  appointmentId,
  patientId,
  doctorId,
  scheduledDate,
  scheduledTime,
}) => {
  const normalizedScheduledDate = String(scheduledDate);
  let nextSequence = await getNextRoomSequenceForDate(normalizedScheduledDate);
  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomName = buildRoomName(normalizedScheduledDate, nextSequence + attempt);
    const meetingLink = `https://meet.jit.si/${roomName}`;

    try {
      return await TelemedicineSession.create({
        appointmentId: String(appointmentId),
        patientId: String(patientId),
        doctorId: String(doctorId),
        roomName,
        meetingLink,
        scheduledDate: normalizedScheduledDate,
        scheduledTime: String(scheduledTime),
        status: "scheduled",
      });
    } catch (error) {
      if (error?.code !== 11000 || !String(error.message || "").includes("roomName")) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError || new Error("Failed to create a unique room name");
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

const pickFirstString = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const getAppointmentPayload = async (appointmentId) => {
  try {
    const response = await getAppointmentById(String(appointmentId));
    return response?.appointment || null;
  } catch (error) {
    return null;
  }
};

const buildEnrichedSession = async (sessionDoc) => {
  const session =
    typeof sessionDoc.toObject === "function" ? sessionDoc.toObject() : sessionDoc;

  const [appointment, patientAuthUser] = await Promise.all([
    getAppointmentPayload(session.appointmentId),
    getAuthUserById(String(session.patientId)).catch(() => null),
  ]);

  const doctorObject =
    appointment?.doctor ||
    appointment?.doctorDetails ||
    appointment?.doctorProfile ||
    null;

  const patientObject =
    appointment?.patient ||
    appointment?.patientDetails ||
    appointment?.patientProfile ||
    null;

  const doctorName = pickFirstString(
    appointment?.doctorName,
    appointment?.doctorFullName,
    doctorObject?.fullName,
    doctorObject?.name,
    doctorObject?.username
  );

  const doctorSpecialization = pickFirstString(
    appointment?.doctorSpecialization,
    appointment?.specialization,
    doctorObject?.specialization,
    doctorObject?.speciality,
    doctorObject?.department
  );

  const patientName = pickFirstString(
    appointment?.patientName,
    appointment?.patientFullName,
    patientObject?.fullName,
    patientObject?.name,
    patientObject?.username,
    patientAuthUser?.username
  );

  return {
    ...session,
    doctorName: doctorName || undefined,
    doctorSpecialization: doctorSpecialization || undefined,
    patientName: patientName || undefined,
    doctor: {
      id: pickFirstString(
        String(session.doctorId || ""),
        String(doctorObject?._id || ""),
        String(doctorObject?.id || "")
      ) || undefined,
      name: doctorName || undefined,
      fullName: pickFirstString(
        appointment?.doctorFullName,
        doctorObject?.fullName,
        doctorName
      ) || undefined,
      email: pickFirstString(doctorObject?.email) || undefined,
      phone: pickFirstString(doctorObject?.phone) || undefined,
      specialization: doctorSpecialization || undefined,
      profileImage: pickFirstString(
        doctorObject?.profileImage,
        doctorObject?.profileImageUrl,
        doctorObject?.imageUrl
      ) || undefined,
    },
    patient: {
      id: pickFirstString(
        String(session.patientId || ""),
        String(patientObject?._id || ""),
        String(patientObject?.id || "")
      ) || undefined,
      name: patientName || undefined,
      fullName: pickFirstString(
        appointment?.patientFullName,
        patientObject?.fullName,
        patientAuthUser?.username,
        patientName
      ) || undefined,
      email: pickFirstString(
        patientObject?.email,
        patientAuthUser?.email
      ) || undefined,
      phone: pickFirstString(patientObject?.phone) || undefined,
      profileImage: pickFirstString(
        patientObject?.profileImage,
        patientObject?.profileImageUrl,
        patientObject?.imageUrl
      ) || undefined,
    },
    appointment: {
      id: pickFirstString(
        String(appointment?._id || ""),
        String(appointment?.id || ""),
        String(session.appointmentId || "")
      ) || undefined,
      status: pickFirstString(appointment?.status) || undefined,
      date:
        pickFirstString(
          appointment?.appointmentDate,
          appointment?.date,
          session.scheduledDate
        ) || undefined,
      time:
        pickFirstString(
          appointment?.appointmentTime,
          appointment?.time,
          session.scheduledTime
        ) || undefined,
      reason: pickFirstString(
        appointment?.reason,
        appointment?.appointmentReason,
        appointment?.description
      ) || undefined,
      symptoms: pickFirstString(
        appointment?.symptoms,
        appointment?.symptomSummary
      ) || undefined,
      consultationType: pickFirstString(
        appointment?.consultationType,
        appointment?.type
      ) || undefined,
    },
  };
};

const enrichSessions = async (sessions) => {
  return Promise.all(sessions.map((session) => buildEnrichedSession(session)));
};

const createSession = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        message: "Only doctors can create telemedicine sessions",
      });
    }

    const { appointmentId, patientId, scheduledDate, scheduledTime } =
      req.body || {};

    if (!appointmentId || !patientId || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        message:
          "appointmentId, patientId, scheduledDate and scheduledTime are required",
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

    const enrichedSession = await buildEnrichedSession(session);

    return res.status(201).json({
      message: "Telemedicine session created successfully",
      session: enrichedSession,
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
      const enrichedExistingSession = await buildEnrichedSession(existingSession);

      return res.status(200).json({
        message: "Telemedicine session already exists",
        session: enrichedExistingSession,
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

    const enrichedSession = await buildEnrichedSession(session);

    return res.status(201).json({
      message: "Telemedicine session created successfully",
      session: enrichedSession,
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
    const enrichedSessions = await enrichSessions(sessions);

    return res.status(200).json(enrichedSessions);
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

    const enrichedSession = await buildEnrichedSession(session);

    return res.status(200).json(enrichedSession);
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

    const enrichedSession = await buildEnrichedSession(session);

    return res.status(200).json(enrichedSession);
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

    const enrichedSessions = await enrichSessions(sessions);

    return res.status(200).json(enrichedSessions);
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

    const enrichedSessions = await enrichSessions(sessions);

    return res.status(200).json(enrichedSessions);
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

    const enrichedSession = await buildEnrichedSession(session);

    return res.status(200).json({
      message: "Session status updated successfully",
      session: enrichedSession,
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

    const enrichedSession = await buildEnrichedSession(updatedSession);

    return res.status(200).json({
      message: "Session notes updated successfully",
      session: enrichedSession,
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
