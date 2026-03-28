const TelemedicineSession = require("../models/telemedicineSession");

const getAppointmentIdFromRequest = (req) =>
  req.params.appointmentId || req.body.appointmentId || req.query.appointmentId;

const sessionAccessMiddleware = async (req, res, next) => {
  try {
    const appointmentId = getAppointmentIdFromRequest(req);

    if (!appointmentId) {
      return res.status(400).json({
        message: "appointmentId is required",
      });
    }

    const session = await TelemedicineSession.findOne({ appointmentId });

    if (!session) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    const loggedUserId = String(req.user.userId);
    const isPatient = req.user.role === "patient" && String(session.patientId) === loggedUserId;
    const isDoctor = req.user.role === "doctor" && String(session.doctorId) === loggedUserId;

    if (!isPatient && !isDoctor) {
      return res.status(403).json({
        message: "You do not have access to this session",
      });
    }

    req.session = session;
    next();
  } catch (error) {
    return res.status(500).json({
      message: "Failed to validate session access",
      error: error.message,
    });
  }
};

module.exports = sessionAccessMiddleware;
