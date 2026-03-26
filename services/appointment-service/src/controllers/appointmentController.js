const Appointment = require("../models/appointmentModel");
const { enforceDoctorAppointmentOwnership } = require("../middleware/authMiddleware");

const ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed"];
const APPOINTMENT_STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const STATUS_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};
const MOCK_DOCTORS = [
  {
    _id: "mock-doc-1",
    fullName: "Dr. Rajesh Kumar",
    specialization: "Orthopedics",
    city: "Galle",
    status: "active",
    consultationFee: 5000,
  },
  {
    _id: "mock-doc-2",
    fullName: "Dr. Saman Kumara",
    specialization: "Dermatology",
    city: "Colombo",
    status: "active",
    consultationFee: 4500,
  },
  {
    _id: "mock-doc-3",
    fullName: "Dr. Nimal Perera",
    specialization: "Cardiology",
    city: "Colombo",
    status: "active",
    consultationFee: 5500,
  },
];

// Keep all specialty/doctor lookups safe by escaping user input for regex matching
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Allow swapping doctor-service host/port and toggling mock search during outages
const getDoctorServiceUrl = () => process.env.DOCTOR_SERVICE_URL || "http://localhost:5005";
const isMockSearchFallbackEnabled = () => (process.env.SEARCH_FALLBACK_MOCK || "false").toLowerCase() === "true";

// Normalize odd Postman payloads like "{Cardiology}" to plain strings
const normalizeSpecializationInput = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  // Supports Postman values accidentally passed as {Ophthalmology}
  return value.trim().replace(/^\{+|\}+$/g, "").trim();
};

// Pull active specialties from doctor-service; bubble failures to allow fallback
const getActiveSpecialties = async () => {
  const response = await fetch(`${getDoctorServiceUrl()}/api/specialties`);
  if (!response.ok) {
    throw new Error("Failed to fetch specialties from doctor service");
  }

  const specialties = await response.json();
  return specialties.filter((specialty) => specialty.isActive !== false);
};

// Dropdown-friendly list of specialties with graceful mock fallback
const getSpecialtiesForDropdown = async (_req, res) => {
  try {
    const specialties = await getActiveSpecialties();
    const specialtyNames = [...new Set(specialties.map((item) => item.name).filter(Boolean))].sort();

    return res.status(200).json({
      source: "doctor-service",
      data: specialtyNames,
    });
  } catch (error) {
    if (isMockSearchFallbackEnabled()) {
      const specialtyNames = [
        ...new Set(MOCK_DOCTORS.map((doctor) => doctor.specialization).filter(Boolean)),
      ].sort();

      return res.status(200).json({
        source: "mock-fallback",
        data: specialtyNames,
      });
    }

    return res.status(502).json({
      message: "Failed to fetch specialties",
      error: `Doctor service unreachable: ${error.message}`,
    });
  }
};

// Ensure specialization matches an active specialty before persisting
const resolveValidSpecialization = async (specialization) => {
  const normalizedValue = normalizeSpecializationInput(specialization);
  if (!normalizedValue) {
    return null;
  }

  const normalizedInput = normalizedValue.toLowerCase();
  const specialties = await getActiveSpecialties();
  const matchedSpecialty = specialties.find(
    (specialty) => (specialty.name || "").trim().toLowerCase() === normalizedInput
  );

  return matchedSpecialty ? matchedSpecialty.name : null;
};

// Search doctors via doctor-service, with optional city filter and mock fallback
const searchDoctorsBySpecialty = async (req, res) => {
  try {
    const { specialization, city } = req.query;
    const normalizedSpecialization = normalizeSpecializationInput(specialization);

    if (!normalizedSpecialization) {
      return res.status(400).json({ message: "specialization query is required" });
    }

    const specializationRegex = new RegExp(`^${escapeRegExp(normalizedSpecialization)}$`, "i");
    const cityRegex = city && city.trim() ? new RegExp(`^${escapeRegExp(city.trim())}$`, "i") : null;

    const response = await fetch(`${getDoctorServiceUrl()}/api/doctors`);

    if (!response.ok) {
      throw new Error(`doctor-service responded with status ${response.status}`);
    }

    const doctors = await response.json();

    const matchedDoctors = doctors.filter((doctor) => {
      const specializationMatch = specializationRegex.test(doctor.specialization || "");
      const activeMatch = (doctor.status || "").toLowerCase() === "active";
      const cityMatch = !cityRegex || cityRegex.test(doctor.city || "");
      return specializationMatch && activeMatch && cityMatch;
    });

    return res.status(200).json(matchedDoctors);
  } catch (error) {
    if (isMockSearchFallbackEnabled()) {
      const normalizedSpecialization = normalizeSpecializationInput(req.query.specialization);
      const specializationRegex = new RegExp(`^${escapeRegExp(normalizedSpecialization)}$`, "i");
      const cityRegex =
        req.query.city && String(req.query.city).trim()
          ? new RegExp(`^${escapeRegExp(String(req.query.city).trim())}$`, "i")
          : null;

      const matchedDoctors = MOCK_DOCTORS.filter((doctor) => {
        const specializationMatch = specializationRegex.test(doctor.specialization || "");
        const activeMatch = (doctor.status || "").toLowerCase() === "active";
        const cityMatch = !cityRegex || cityRegex.test(doctor.city || "");
        return specializationMatch && activeMatch && cityMatch;
      });

      return res.status(200).json({
        source: "mock-fallback",
        data: matchedDoctors,
      });
    }

    return res.status(502).json({
      message: "Failed to search doctors",
      error: `Doctor service unreachable: ${error.message}`,
    });
  }
};

// Prevent overlapping active appointments for the same doctor and timeslot
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

// Patients can only act on their own appointments
const canPatientAccessAppointment = (req, appointment) => {
  const authenticatedPatientId = req.user?.id;
  if (!authenticatedPatientId) {
    return false;
  }

  return String(appointment.patientId) === String(authenticatedPatientId);
};

// Create appointment
const createAppointment = async (req, res) => {
  try {
    const authenticatedPatientId = req.user?.id;

    const {
      patientId,
      doctorId,
      doctorName,
      specialization,
      appointmentDate,
      appointmentTime,
      reason,
      paymentStatus,
    } = req.body;

    if (!patientId || !doctorId || !doctorName || !specialization || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        message: "patientId, doctorId, doctorName, specialization, appointmentDate and appointmentTime are required",
      });
    }

    if (!authenticatedPatientId) {
      return res.status(401).json({
        message: "Patient authentication is required",
      });
    }

    if (String(patientId) !== String(authenticatedPatientId)) {
      return res.status(403).json({
        message: "You can only book appointments for your own patient account",
      });
    }

    const validSpecialization = await resolveValidSpecialization(specialization);
    if (!validSpecialization) {
      return res.status(400).json({
        message: "Invalid specialization. Please select a valid active specialty.",
      });
    }

    const conflict = await hasTimeConflict(doctorId, appointmentDate, appointmentTime);
    if (conflict) {
      return res.status(409).json({
        message: "Appointment slot already booked for this doctor",
      });
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      doctorName,
      specialization: validSpecialization,
      appointmentDate,
      appointmentTime,
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

// Get all appointments
const getAllAppointments = async (req, res) => {
  try {
    const { status, patientId, doctorId } = req.query;
    const authenticatedPatientId = req.user?.id;

    if (!authenticatedPatientId) {
      return res.status(401).json({
        message: "Patient authentication is required",
      });
    }

    if (patientId && String(patientId) !== String(authenticatedPatientId)) {
      return res.status(403).json({
        message: "You can only access your own appointments",
      });
    }

    const query = {};

    query.patientId = authenticatedPatientId;

    if (status) {
      query.status = status;
    }

    if (doctorId) {
      query.doctorId = doctorId;
    }

    const appointments = await Appointment.find(query).sort({ createdAt: -1 });

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch appointments",
      error: error.message,
    });
  }
};

// Get appointment by ID
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

// Get appointments by doctorId
const getAppointmentsByDoctorId = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctorId: req.params.doctorId,
    }).sort({ createdAt: -1 });

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch doctor appointments",
      error: error.message,
    });
  }
};

// Update appointment
// Patient-side updates with slot conflict checks and specialization validation
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

    if (updatePayload.specialization !== undefined) {
      const validSpecialization = await resolveValidSpecialization(updatePayload.specialization);
      if (!validSpecialization) {
        return res.status(400).json({
          message: "Invalid specialization. Please select a valid active specialty.",
        });
      }

      updatePayload.specialization = validSpecialization;
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

// Cancel appointment
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
    appointment.statusHistory.push({ status: "cancelled", note: "Appointment cancelled" });
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

// Delete appointment
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

// Update appointment status only
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
};