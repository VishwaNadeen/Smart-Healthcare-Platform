const Appointment = require("../models/appointmentModel");
const { enforceDoctorAppointmentOwnership } = require("../middleware/authMiddleware");
const { getAuthUserById } = require("../services/authService");
const {
  createTelemedicineSessionForAppointment,
} = require("../services/telemedicineService");

const ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed"];
const APPOINTMENT_STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || "http://localhost:5003";
const CONSULTATION_DURATION_MINUTES = 10;
const STATUS_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const normalizeString = (value) => String(value || "").trim();

const toMinutes = (time) => {
  const [hours, minutes] = String(time || "")
    .split(":")
    .map((value) => Number(value));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return NaN;
  }

  return hours * 60 + minutes;
};

const getWeekdayFromDate = (appointmentDate) => {
  const date = new Date(`${normalizeString(appointmentDate)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", { weekday: "long" });
};

const buildLegacyScheduleForDay = (doctor, day) => {
  if (
    !Array.isArray(doctor?.availableDays) ||
    !doctor.availableDays.includes(day) ||
    !Array.isArray(doctor?.availableTimeSlots)
  ) {
    return [];
  }

  return doctor.availableTimeSlots
    .map((slot) => {
      const [startTime = "", endTime = ""] = String(slot || "").split("-");
      const duration = toMinutes(endTime) - toMinutes(startTime);

      if (duration < CONSULTATION_DURATION_MINUTES) {
        return null;
      }

      return {
        day,
        startTime,
        endTime,
        maxAppointments: Math.max(
          1,
          Math.floor(duration / CONSULTATION_DURATION_MINUTES)
        ),
      };
    })
    .filter(Boolean);
};

const getScheduleSlotsForDate = (doctor, appointmentDate) => {
  const day = getWeekdayFromDate(appointmentDate);

  if (!day) {
    return [];
  }

  const detailedSchedule = Array.isArray(doctor?.availabilitySchedule)
    ? doctor.availabilitySchedule.filter((slot) => slot.day === day)
    : [];

  if (detailedSchedule.length > 0) {
    return detailedSchedule;
  }

  return buildLegacyScheduleForDay(doctor, day);
};

const findMatchingScheduleSlot = (doctor, appointmentDate, appointmentTime) => {
  const appointmentStart = toMinutes(appointmentTime);

  if (Number.isNaN(appointmentStart)) {
    return null;
  }

  return getScheduleSlotsForDate(doctor, appointmentDate).find((slot) => {
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);

    if (Number.isNaN(start) || Number.isNaN(end)) {
      return false;
    }

    return (
      appointmentStart >= start &&
      appointmentStart + CONSULTATION_DURATION_MINUTES <= end &&
      (appointmentStart - start) % CONSULTATION_DURATION_MINUTES === 0
    );
  });
};

const fetchDoctorProfile = async (doctorId) => {
  const response = await fetch(
    `${DOCTOR_SERVICE_URL}/api/doctors/${encodeURIComponent(doctorId)}`
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Failed to fetch doctor profile");
    error.status = response.status;
    throw error;
  }

  return data;
};

const countAppointmentsInScheduleSlot = async ({
  doctorId,
  appointmentDate,
  scheduleSlot,
  excludeAppointmentId,
}) => {
  const query = {
    doctorId,
    appointmentDate,
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const appointments = await Appointment.find(query).select("appointmentTime");
  const slotStart = toMinutes(scheduleSlot.startTime);
  const slotEnd = toMinutes(scheduleSlot.endTime);

  return appointments.filter((appointment) => {
    const appointmentStart = toMinutes(appointment.appointmentTime);

    return (
      !Number.isNaN(appointmentStart) &&
      appointmentStart >= slotStart &&
      appointmentStart + CONSULTATION_DURATION_MINUTES <= slotEnd
    );
  }).length;
};

const validateDoctorScheduleAvailability = async ({
  doctorId,
  appointmentDate,
  appointmentTime,
  excludeAppointmentId,
}) => {
  const doctor = await fetchDoctorProfile(doctorId);

  if (doctor?.acceptsNewAppointments === false) {
    return "This doctor is not accepting new appointments right now";
  }

  const scheduleSlot = findMatchingScheduleSlot(
    doctor,
    appointmentDate,
    appointmentTime
  );

  if (!scheduleSlot) {
    return "Doctor is not available at the selected date and time";
  }

  const existingAppointments = await countAppointmentsInScheduleSlot({
    doctorId,
    appointmentDate,
    scheduleSlot,
    excludeAppointmentId,
  });

  if (existingAppointments >= Number(scheduleSlot.maxAppointments || 1)) {
    return "This schedule is already fully booked";
  }

  return null;
};

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

    const availabilityMessage = await validateDoctorScheduleAvailability({
      doctorId: normalizeString(doctorId),
      appointmentDate: normalizeString(appointmentDate),
      appointmentTime: normalizeString(appointmentTime),
    });

    if (availabilityMessage) {
      return res.status(409).json({ message: availabilityMessage });
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
      const availabilityMessage = await validateDoctorScheduleAvailability({
        doctorId: normalizeString(nextDoctorId),
        appointmentDate: normalizeString(nextAppointmentDate),
        appointmentTime: normalizeString(nextAppointmentTime),
        excludeAppointmentId: appointment._id,
      });

      if (availabilityMessage) {
        return res.status(409).json({ message: availabilityMessage });
      }

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

const getAdminAppointments = async (req, res) => {
  try {
    const { status, patientId, doctorId, appointmentDate } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (doctorId) {
      query.doctorId = doctorId;
    }

    if (appointmentDate) {
      query.appointmentDate = appointmentDate;
    }

    const appointments = await Appointment.find(query).sort({ createdAt: -1 });
    return res.status(200).json(appointments);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch appointments",
      error: error.message,
    });
  }
};

const getAdminAppointmentActivity = async (_req, res) => {
  try {
    const [totalAppointments, pendingAppointments, confirmedAppointments, completedAppointments, cancelledAppointments] =
      await Promise.all([
        Appointment.countDocuments(),
        Appointment.countDocuments({ status: "pending" }),
        Appointment.countDocuments({ status: "confirmed" }),
        Appointment.countDocuments({ status: "completed" }),
        Appointment.countDocuments({ status: "cancelled" }),
      ]);

    return res.status(200).json({
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch appointment activity",
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
  getAdminAppointments,
  getAdminAppointmentActivity,
  getPatientAppointmentStatsAdmin,
  getInternalAppointmentById,
  updateAppointmentStatusInternal,
};
