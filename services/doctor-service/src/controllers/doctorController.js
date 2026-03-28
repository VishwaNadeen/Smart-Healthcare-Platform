const util = require("util");
const Doctor = require("../models/doctorModel");
const Specialty = require("../models/specialtyModel");
const { registerDoctorAuth, deleteDoctorAuthByEmail } = require("../services/authService");

const extractErrorMessage = (error) => {
  if (typeof error === "string") {
    return error || "Unknown error";
  }

  if (!error || typeof error !== "object") {
    return "Unknown error";
  }

  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    "Unknown error"
  );
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  return undefined;
};

const doctorAllowedFields = [
  "fullName",
  "email",
  "phone",
  "specialization",
  "experience",
  "qualification",
  "licenseNumber",
  "hospitalName",
  "hospitalAddress",
  "city",
  "availableDays",
  "availableTimeSlots",
  "consultationFee",
  "isAvailableForVideo",
  "profileImage",
  "about",
  "status",
  "supportsDigitalPrescriptions",
  "acceptsNewAppointments",
  "availabilitySchedule",
];

const adminDoctorAllowedFields = [...doctorAllowedFields, "verificationNote"];

const sanitizeStringArray = (values) => {
  if (!Array.isArray(values)) {
    return undefined;
  }

  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
};

const sanitizeAvailabilitySchedule = (slots) => {
  if (!Array.isArray(slots)) {
    return undefined;
  }

  return slots
    .map((slot) => ({
      day: String(slot?.day || "").trim(),
      startTime: String(slot?.startTime || "").trim(),
      endTime: String(slot?.endTime || "").trim(),
      mode: ["in_person", "video", "both"].includes(slot?.mode) ? slot.mode : "in_person",
      maxAppointments:
        Number.isFinite(Number(slot?.maxAppointments)) && Number(slot.maxAppointments) > 0
          ? Number(slot.maxAppointments)
          : 1,
    }))
    .filter((slot) => slot.day && slot.startTime && slot.endTime);
};

const sanitizeDoctorPayload = (payload = {}) => {
  return sanitizePayloadWithAllowedFields(payload, doctorAllowedFields);
};

const sanitizePayloadWithAllowedFields = (payload = {}, allowedFields = []) => {
  const sanitizedPayload = Object.fromEntries(
    Object.entries(payload).filter(([key]) => allowedFields.includes(key))
  );

  if (sanitizedPayload.email !== undefined) {
    sanitizedPayload.email = String(sanitizedPayload.email).trim().toLowerCase();
  }

  const availableDays = sanitizeStringArray(payload.availableDays);
  if (availableDays !== undefined) {
    sanitizedPayload.availableDays = availableDays;
  }

  const availableTimeSlots = sanitizeStringArray(payload.availableTimeSlots);
  if (availableTimeSlots !== undefined) {
    sanitizedPayload.availableTimeSlots = availableTimeSlots;
  }

  const availabilitySchedule = sanitizeAvailabilitySchedule(payload.availabilitySchedule);
  if (availabilitySchedule !== undefined) {
    sanitizedPayload.availabilitySchedule = availabilitySchedule;
  }

  return sanitizedPayload;
};

const resolveSpecialty = async (specializationName) => {
  if (typeof specializationName !== "string" || !specializationName.trim()) {
    return null;
  }

  const normalizedName = specializationName.trim();
  const specialty = await Specialty.findOne({
    name: { $regex: new RegExp(`^${escapeRegExp(normalizedName)}$`, "i") },
    isActive: true,
  });

  return specialty;
};

const findDoctorByAuthUserId = async (authUserId) => {
  if (!authUserId) {
    return null;
  }

  return Doctor.findOne({ authUserId })
    .select("+authUserId")
    .populate("specializationId", "name description isActive");
};

const ensureDoctorIdentity = async (req, res) => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Authentication is required" });
    return null;
  }

  if (req.user.role !== "doctor") {
    res.status(403).json({ message: "Doctor access is required" });
    return null;
  }

  const doctor = await findDoctorByAuthUserId(req.user.id);
  if (!doctor) {
    res.status(404).json({ message: "Doctor profile not found for this account" });
    return null;
  }

  return doctor;
};

const toDoctorResponse = (doctorDocument) => {
  if (!doctorDocument) {
    return doctorDocument;
  }

  const doctor = doctorDocument.toObject ? doctorDocument.toObject() : { ...doctorDocument };
  delete doctor.authUserId;
  return doctor;
};

const createDoctor = async (req, res) => {
  let shouldRollbackAuthUser = false;
  let rollbackEmail = null;

  try {
    const password = req.body?.password;
    const doctorPayload = sanitizeDoctorPayload(req.body);
    const { fullName, email } = doctorPayload;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Full name, email and password are required" });
    }

    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ message: "Doctor already exists" });
    }

    const specialty = await resolveSpecialty(doctorPayload.specialization);
    if (!specialty) {
      return res.status(400).json({ message: "Specialization must match an active specialty" });
    }

    const authRegistration = await registerDoctorAuth({ fullName, email, password });
    const authUserId = authRegistration?.user?.id;

    if (!authUserId) {
      return res.status(502).json({
        message: "Failed to create doctor",
        error: "Auth service did not return a doctor user id",
      });
    }

    shouldRollbackAuthUser = true;
    rollbackEmail = email;

    const doctor = await Doctor.create({
      ...doctorPayload,
      authUserId,
      specialization: specialty.name,
      specializationId: specialty._id,
      status: "inactive",
      verificationStatus: "pending",
      verificationNote: "",
      verifiedAt: null,
    });

    shouldRollbackAuthUser = false;
    return res.status(201).json(toDoctorResponse(doctor));
  } catch (error) {
    if (shouldRollbackAuthUser && rollbackEmail) {
      try {
        await deleteDoctorAuthByEmail(rollbackEmail);
      } catch (rollbackError) {
        console.error("createDoctor rollback failed:", rollbackError.message);
      }
    }

    console.error("createDoctor failed:", {
      rawError: util.inspect(error, { depth: 5 }),
      errorType: typeof error,
      message: error?.message,
      responseStatus: error?.response?.status,
      responseData: error?.response?.data,
    });

    return res.status(error?.response?.status || 500).json({
      message: "Failed to create doctor",
      error: extractErrorMessage(error),
    });
  }
};

const getAllDoctors = async (req, res) => {
  try {
    const { specialization, city, status, isAvailableForVideo, acceptsNewAppointments } = req.query;
    const query = {};

    if (specialization) {
      query.specialization = {
        $regex: new RegExp(`^${escapeRegExp(String(specialization).trim())}$`, "i"),
      };
    }

    if (city) {
      query.city = {
        $regex: new RegExp(`^${escapeRegExp(String(city).trim())}$`, "i"),
      };
    }

    if (status) {
      query.status = String(status).trim().toLowerCase();
    }

    const videoAvailability = parseBoolean(isAvailableForVideo);
    if (videoAvailability !== undefined) {
      query.isAvailableForVideo = videoAvailability;
    }

    const appointmentAvailability = parseBoolean(acceptsNewAppointments);
    if (appointmentAvailability !== undefined) {
      query.acceptsNewAppointments = appointmentAvailability;
    }

    const doctors = await Doctor.find(query).populate("specializationId", "name description isActive");
    return res.status(200).json(doctors.map(toDoctorResponse));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch doctors", error: error.message });
  }
};

const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate("specializationId", "name description isActive");
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    return res.status(200).json(toDoctorResponse(doctor));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch doctor", error: error.message });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const updatePayload = sanitizePayloadWithAllowedFields(req.body, adminDoctorAllowedFields);

    if (updatePayload.specialization !== undefined) {
      const specialty = await resolveSpecialty(updatePayload.specialization);
      if (!specialty) {
        return res.status(400).json({ message: "Specialization must match an active specialty" });
      }

      updatePayload.specialization = specialty.name;
      updatePayload.specializationId = specialty._id;
    }

    const doctor = await Doctor.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    }).populate("specializationId", "name description isActive");

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    return res.status(200).json(toDoctorResponse(doctor));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update doctor", error: error.message });
  }
};

const getDoctorsForVerification = async (req, res) => {
  try {
    const { verificationStatus } = req.query;
    const query = {};

    if (verificationStatus) {
      query.verificationStatus = String(verificationStatus).trim().toLowerCase();
    }

    const doctors = await Doctor.find(query)
      .populate("specializationId", "name description isActive")
      .sort({ createdAt: -1 });

    return res.status(200).json(doctors.map(toDoctorResponse));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch doctor verifications", error: error.message });
  }
};

const updateDoctorVerification = async (req, res) => {
  try {
    const verificationStatus = String(req.body?.verificationStatus || "").trim().toLowerCase();
    const verificationNote =
      req.body?.verificationNote === undefined ? undefined : String(req.body.verificationNote || "").trim();

    if (!["approved", "rejected"].includes(verificationStatus)) {
      return res.status(400).json({
        message: "verificationStatus must be approved or rejected",
      });
    }

    const doctor = await Doctor.findById(req.params.id).populate("specializationId", "name description isActive");
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    doctor.verificationStatus = verificationStatus;
    doctor.status = verificationStatus === "approved" ? "active" : "inactive";
    doctor.verificationNote = verificationNote !== undefined ? verificationNote : doctor.verificationNote;
    doctor.verifiedAt = new Date();
    await doctor.save();

    return res.status(200).json({
      message: `Doctor ${verificationStatus} successfully`,
      doctor: toDoctorResponse(doctor),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update doctor verification", error: error.message });
  }
};

const deleteMyDoctorProfile = async (req, res) => {
  try {
    const doctor = await ensureDoctorIdentity(req, res);
    if (!doctor) {
      return;
    }

    await Doctor.findByIdAndDelete(doctor._id);
    return res.status(200).json({ message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete doctor", error: error.message });
  }
};

const getMyDoctorProfile = async (req, res) => {
  try {
    const doctor = await ensureDoctorIdentity(req, res);
    if (!doctor) {
      return;
    }

    return res.status(200).json(toDoctorResponse(doctor));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch doctor profile", error: error.message });
  }
};

const updateMyDoctorProfile = async (req, res) => {
  try {
    const doctor = await ensureDoctorIdentity(req, res);
    if (!doctor) {
      return;
    }

    const updatePayload = sanitizeDoctorPayload(req.body);

    if (updatePayload.specialization !== undefined) {
      const specialty = await resolveSpecialty(updatePayload.specialization);
      if (!specialty) {
        return res.status(400).json({ message: "Specialization must match an active specialty" });
      }

      updatePayload.specialization = specialty.name;
      updatePayload.specializationId = specialty._id;
    }

    Object.assign(doctor, updatePayload);
    await doctor.save();
    await doctor.populate("specializationId", "name description isActive");

    return res.status(200).json(toDoctorResponse(doctor));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update doctor profile", error: error.message });
  }
};

const getMyAvailability = async (req, res) => {
  try {
    const doctor = await ensureDoctorIdentity(req, res);
    if (!doctor) {
      return;
    }

    return res.status(200).json({
      doctorId: doctor._id,
      availableDays: doctor.availableDays || [],
      availableTimeSlots: doctor.availableTimeSlots || [],
      availabilitySchedule: doctor.availabilitySchedule || [],
      isAvailableForVideo: doctor.isAvailableForVideo,
      acceptsNewAppointments: doctor.acceptsNewAppointments,
      supportsDigitalPrescriptions: doctor.supportsDigitalPrescriptions,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch doctor availability", error: error.message });
  }
};

const updateMyAvailability = async (req, res) => {
  try {
    const doctor = await ensureDoctorIdentity(req, res);
    if (!doctor) {
      return;
    }

    const updatePayload = sanitizeDoctorPayload(req.body);
    const availabilityFields = [
      "availableDays",
      "availableTimeSlots",
      "isAvailableForVideo",
      "availabilitySchedule",
      "acceptsNewAppointments",
      "supportsDigitalPrescriptions",
    ];
    const availabilityUpdate = Object.fromEntries(
      Object.entries(updatePayload).filter(([key]) => availabilityFields.includes(key))
    );

    Object.assign(doctor, availabilityUpdate);
    await doctor.save();

    return res.status(200).json({
      message: "Doctor availability updated successfully",
      doctorId: doctor._id,
      availableDays: doctor.availableDays || [],
      availableTimeSlots: doctor.availableTimeSlots || [],
      availabilitySchedule: doctor.availabilitySchedule || [],
      isAvailableForVideo: doctor.isAvailableForVideo,
      acceptsNewAppointments: doctor.acceptsNewAppointments,
      supportsDigitalPrescriptions: doctor.supportsDigitalPrescriptions,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update doctor availability", error: error.message });
  }
};

module.exports = {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  getDoctorsForVerification,
  updateDoctorVerification,
  deleteMyDoctorProfile,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  getMyAvailability,
  updateMyAvailability,
};
