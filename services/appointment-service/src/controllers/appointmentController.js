const Appointment = require("../models/appointmentModel");
const { enforceDoctorAppointmentOwnership } = require("../middleware/authMiddleware");
const { getAuthUserById } = require("../services/authService");
const {
  createTelemedicineSessionForAppointment,
} = require("../services/telemedicineService");

const ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed"];
const APPOINTMENT_STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const STATUS_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const normalizeString = (value) => String(value || "").trim();

const enrichAppointmentWithPatientName = async (appointmentDoc) => {
  const appointment =
    typeof appointmentDoc?.toObject === "function"
      ? appointmentDoc.toObject()
      : appointmentDoc;

  try {
    const authUser = await getAuthUserById(String(appointment.patientId || ""));

    return {
      ...appointment,
      patientName:
        typeof authUser?.username === "string" && authUser.username.trim()
          ? authUser.username.trim()
          : undefined,
    };
  } catch {
    return appointment;
  }
};

const hasTimeConflict = async (doctorId, appointmentDate, appointmentTime, excludeAppointmentId) => {
  const query = {
    doctorId,
    appointmentDate,
    appointmentTime,
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const conflict = await Appointment.findOne(query);
  return Boolean(conflict);
};

const canPatientAccessAppointment = (req, appointment) =>
  String(appointment.patientId) === String(req.user?.id);

const hasValidInternalSecret = (req) => {
  const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;

  if (!expectedSecret) {
    return true;
  }

  return req.headers["x-internal-service-secret"] === expectedSecret;
};

const getSpecialtiesForDropdown = async (_req, res) => {
  return res.status(410).json({
    message:
      "This endpoint was removed to keep appointment-service independent. Fetch specialties directly from doctor-service.",
  });
};

const searchDoctorsBySpecialty = async (_req, res) => {
  return res.status(410).json({
    message:
      "This endpoint was removed to keep appointment-service independent. Search doctors directly from doctor-service.",
  });
};

const validateAppointmentPayload = ({
  doctorId,
  doctorName,
  specialization,
  appointmentDate,
  appointmentTime,
}) => {
  if (!doctorId || !doctorName || !specialization || !appointmentDate || !appointmentTime) {
    return "doctorId, doctorName, specialization, appointmentDate and appointmentTime are required";
  }

  return null;
};

const createAppointment = async (req, res) => {
  try {
    const authenticatedPatientId = req.user?.id;
    const patientId = authenticatedPatientId;
    const {
      doctorId,
      doctorName,
      specialization,
      appointmentDate,
      appointmentTime,
      reason,
      paymentStatus,
    } = req.body;

    const validationMessage = validateAppointmentPayload({
      doctorId,
      doctorName,
      specialization,
      appointmentDate,
      appointmentTime,
    });

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const conflict = await hasTimeConflict(doctorId, appointmentDate, appointmentTime);

    if (conflict) {
      return res.status(409).json({
        message: "Appointment slot already booked for this doctor",
      });
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId: normalizeString(doctorId),
      doctorName: normalizeString(doctorName),
      specialization: normalizeString(specialization),
      appointmentDate: normalizeString(appointmentDate),
      appointmentTime: normalizeString(appointmentTime),
      reason,
      paymentStatus,
      statusHistory: [{ status: "pending", note: "Appointment created" }],
    });

    res.status(201).json({
      message: "Appointment created successfully",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create appointment",
      error: error.message,
    });
  }
};

const getAllAppointments = async (req, res) => {
  try {
    const { status, doctorId } = req.query;
    const query = { patientId: req.user.id };

    if (status) query.status = status;
    if (doctorId) query.doctorId = doctorId;

    const appointments = await Appointment.find(query).sort({ createdAt: -1 });
    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch appointments",
      error: error.message,
    });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!canPatientAccessAppointment(req, appointment)) {
      return res.status(403).json({
        message: "You can only access your own appointments",
      });
    }

    res.status(200).json(appointment);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch appointment",
      error: error.message,
    });
  }
};

const getAppointmentsByDoctorId = async (req, res) => {
  try {
    const doctorId = req.user?.doctorProfileId || req.params.doctorId || req.user?.id;
    const appointments = await Appointment.find({ doctorId }).sort({ createdAt: -1 });
    const enrichedAppointments = await Promise.all(
      appointments.map((appointment) => enrichAppointmentWithPatientName(appointment))
    );

    res.status(200).json(enrichedAppointments);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch doctor appointments",
      error: error.message,
    });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const allowedUpdates = [
      "doctorId",
      "doctorName",
      "specialization",
      "appointmentDate",
      "appointmentTime",
      "reason",
      "paymentStatus",
    ];

    const updatePayload = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedUpdates.includes(key))
    );

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!canPatientAccessAppointment(req, appointment)) {
      return res.status(403).json({
        message: "You can only modify your own appointments",
      });
    }

    if (["completed", "cancelled"].includes(appointment.status)) {
      return res.status(409).json({
        message: `Cannot modify a ${appointment.status} appointment`,
      });
    }

    const nextDoctorId = updatePayload.doctorId || appointment.doctorId;
    const nextAppointmentDate = updatePayload.appointmentDate || appointment.appointmentDate;
    const nextAppointmentTime = updatePayload.appointmentTime || appointment.appointmentTime;

    const slotChanged =
      nextDoctorId !== appointment.doctorId ||
      nextAppointmentDate !== appointment.appointmentDate ||
      nextAppointmentTime !== appointment.appointmentTime;

    if (slotChanged) {
      const conflict = await hasTimeConflict(
        nextDoctorId,
        nextAppointmentDate,
        nextAppointmentTime,
        appointment._id
      );

      if (conflict) {
        return res.status(409).json({
          message: "Appointment slot already booked for this doctor",
        });
      }
    }

    Object.assign(appointment, updatePayload);
    await appointment.save();

    res.status(200).json({
      message: "Appointment updated successfully",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update appointment",
      error: error.message,
    });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!canPatientAccessAppointment(req, appointment)) {
      return res.status(403).json({
        message: "You can only cancel your own appointments",
      });
    }

    if (appointment.status === "completed") {
      return res.status(409).json({
        message: "Completed appointment cannot be cancelled",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(200).json({
        message: "Appointment already cancelled",
        appointment,
      });
    }

    appointment.status = "cancelled";
    appointment.statusHistory.push({
      status: "cancelled",
      note: "Appointment cancelled",
    });

    await appointment.save();

    res.status(200).json({
      message: "Appointment cancelled successfully",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to cancel appointment",
      error: error.message,
    });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!canPatientAccessAppointment(req, appointment)) {
      return res.status(403).json({
        message: "You can only delete your own appointments",
      });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Appointment deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete appointment",
      error: error.message,
    });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!APPOINTMENT_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!enforceDoctorAppointmentOwnership(req, appointment)) {
      return res.status(403).json({
        message: "You can only update status for your own appointments",
      });
    }

    if (appointment.status !== status) {
      const previousStatus = appointment.status;
      const allowedTransitions = STATUS_TRANSITIONS[appointment.status] || [];

      if (!allowedTransitions.includes(status)) {
        return res.status(409).json({
          message: `Invalid status transition from ${appointment.status} to ${status}`,
        });
      }

      if (previousStatus === "pending" && status === "confirmed") {
        await createTelemedicineSessionForAppointment(appointment._id);
      }

      appointment.status = status;
      appointment.statusHistory.push({
        status,
        note: typeof note === "string" ? note : "",
      });

      await appointment.save();
    }

    res.status(200).json({
      message: "Appointment status updated successfully",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update appointment status",
      error: error.message,
    });
  }
};

const getAppointmentTracking = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).select(
      "patientId status paymentStatus statusHistory updatedAt"
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!canPatientAccessAppointment(req, appointment)) {
      return res.status(403).json({
        message: "You can only access your own appointments",
      });
    }

    return res.status(200).json({
      appointmentId: appointment._id,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      updatedAt: appointment.updatedAt,
      statusHistory: appointment.statusHistory,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch appointment tracking",
      error: error.message,
    });
  }
};

const getPatientAppointmentStatsAdmin = async (req, res) => {
  try {
    const patientId = normalizeString(req.params.patientId);

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    const appointments = await Appointment.find({ patientId }).select("status");

    const stats = {
      totalBookings: appointments.length,
      pendingBookings: appointments.filter((item) => item.status === "pending")
        .length,
      confirmedBookings: appointments.filter(
        (item) => item.status === "confirmed"
      ).length,
      completedBookings: appointments.filter(
        (item) => item.status === "completed"
      ).length,
      cancelledBookings: appointments.filter(
        (item) => item.status === "cancelled"
      ).length,
    };

    return res.status(200).json(stats);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch patient appointment stats",
      error: error.message,
    });
  }
};

const getInternalAppointmentById = async (req, res) => {
  try {
    if (!hasValidInternalSecret(req)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    return res.status(200).json({
      appointment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch appointment",
      error: error.message,
    });
  }
};
const updateAppointmentStatusInternal = async (req, res) => {
  try {
    if (!hasValidInternalSecret(req)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { status, note } = req.body;

    if (!APPOINTMENT_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.status !== status) {
      const allowedTransitions = STATUS_TRANSITIONS[appointment.status] || [];

      if (!allowedTransitions.includes(status)) {
        return res.status(409).json({
          message: `Invalid status transition from ${appointment.status} to ${status}`,
        });
      }

      appointment.status = status;
      appointment.statusHistory.push({
        status,
        note: typeof note === "string" ? note : "",
      });

      await appointment.save();
    }

    return res.status(200).json({
      message: "Appointment status updated successfully",
      appointment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update appointment status",
      error: error.message,
    });
  }
};
//nimesh add- payment status changes after payment is done
const updateAppointmentPaymentStatusInternal = async (req, res) => {
  try {
    if (!hasValidInternalSecret(req)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { paymentStatus } = req.body;
    const validStatuses = ["pending", "paid", "failed"];

    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid paymentStatus value" });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.paymentStatus = paymentStatus;
    await appointment.save();

    return res.status(200).json({
      message: "Appointment payment status updated successfully",
      appointment,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update appointment payment status",
      error: error.message,
    });
  }
};




module.exports = {
  getSpecialtiesForDropdown,
  searchDoctorsBySpecialty,
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  getAppointmentsByDoctorId,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
  updateAppointmentStatus,
  getAppointmentTracking,
  getPatientAppointmentStatsAdmin,
  getInternalAppointmentById,
  updateAppointmentStatusInternal,
  updateAppointmentPaymentStatusInternal,  // ← add this nimesh
};

