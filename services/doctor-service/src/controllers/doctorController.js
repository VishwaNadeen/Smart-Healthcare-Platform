const util = require("util");
const Doctor = require("../models/doctorModel");
const DoctorServiceProfile = require("../models/doctorServiceProfileModel");
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
];

const doctorServiceProfileAllowedFields = [
  "supportsDigitalPrescriptions",
  "acceptsNewAppointments",
  "availabilitySchedule",
];

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
  const sanitizedPayload = Object.fromEntries(
    Object.entries(payload).filter(([key]) => doctorAllowedFields.includes(key))
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

  return sanitizedPayload;
};

const sanitizeDoctorServiceProfilePayload = (payload = {}) => {
  const sanitizedPayload = Object.fromEntries(
    Object.entries(payload).filter(([key]) => doctorServiceProfileAllowedFields.includes(key))
  );

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

const findDoctorIdentityByAuthUserId = async (authUserId) => {
  if (!authUserId) {
    return null;
  }

  const doctorProfile = await DoctorServiceProfile.findOne({ authUserId }).select("+authUserId");
  if (!doctorProfile) {
    return null;
  }

  const doctor = await Doctor.findById(doctorProfile.doctorId).populate(
    "specializationId",
    "name description isActive"
  );

  if (!doctor) {
    return null;
  }

  return { doctor, doctorProfile };
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

  const identity = await findDoctorIdentityByAuthUserId(req.user.id);
  if (!identity) {
    res.status(404).json({ message: "Doctor profile not found for this account" });
    return null;
  }

  return identity;
};

const toDoctorResponse = (doctorDocument, doctorProfileDocument = null) => {
  if (!doctorDocument) {
    return doctorDocument;
  }

  const doctor = doctorDocument.toObject ? doctorDocument.toObject() : { ...doctorDocument };
  const doctorProfile = doctorProfileDocument
    ? doctorProfileDocument.toObject
      ? doctorProfileDocument.toObject()
      : { ...doctorProfileDocument }
    : {};

  delete doctorProfile.authUserId;
  delete doctorProfile.doctorId;
  delete doctorProfile._id;
  delete doctorProfile.createdAt;
  delete doctorProfile.updatedAt;

  return {
    ...doctor,
    supportsDigitalPrescriptions: doctorProfile.supportsDigitalPrescriptions ?? true,
    acceptsNewAppointments: doctorProfile.acceptsNewAppointments ?? true,
    availabilitySchedule: doctorProfile.availabilitySchedule || [],
  };
};

const attachDoctorServiceProfile = async (doctorDocument) => {
  if (!doctorDocument?._id) {
    return toDoctorResponse(doctorDocument);
  }

  const doctorProfile = await DoctorServiceProfile.findOne({ doctorId: doctorDocument._id });
  return toDoctorResponse(doctorDocument, doctorProfile);
};

const attachDoctorServiceProfiles = async (doctorDocuments) => {
  const doctorIds = doctorDocuments.map((doctor) => doctor?._id).filter(Boolean);
  const doctorProfiles = await DoctorServiceProfile.find({ doctorId: { $in: doctorIds } });
  const profileByDoctorId = new Map(
    doctorProfiles.map((profile) => [String(profile.doctorId), profile])
  );

  return doctorDocuments.map((doctor) =>
    toDoctorResponse(doctor, profileByDoctorId.get(String(doctor._id)))
  );
};

const createDoctor = async (req, res) => {
  let shouldRollbackAuthUser = false;
  let rollbackEmail = null;

  try {
    const password = req.body?.password;
    const doctorPayload = sanitizeDoctorPayload(req.body);
    const doctorServiceProfilePayload = sanitizeDoctorServiceProfilePayload(req.body);
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

    const doctorData = {
      ...doctorPayload,
      specialization: specialty.name,
      specializationId: specialty._id,
    };

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

    const doctor = await Doctor.create(doctorData);
    await DoctorServiceProfile.create({
      doctorId: doctor._id,
      authUserId,
      ...doctorServiceProfilePayload,
    });

    shouldRollbackAuthUser = false;
    return res.status(201).json(await attachDoctorServiceProfile(doctor));
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

    const doctors = await Doctor.find(query).populate("specializationId", "name description isActive");
    let responseDoctors = await attachDoctorServiceProfiles(doctors);

    const appointmentAvailability = parseBoolean(acceptsNewAppointments);
    if (appointmentAvailability !== undefined) {
      responseDoctors = responseDoctors.filter(
        (doctor) => Boolean(doctor.acceptsNewAppointments) === appointmentAvailability
      );
    }

    return res.status(200).json(responseDoctors);
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

    return res.status(200).json(await attachDoctorServiceProfile(doctor));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch doctor", error: error.message });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const updatePayload = sanitizeDoctorPayload(req.body);
    const serviceProfilePayload = sanitizeDoctorServiceProfilePayload(req.body);

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

    if (Object.keys(serviceProfilePayload).length > 0) {
      await DoctorServiceProfile.findOneAndUpdate(
        { doctorId: doctor._id },
        { $set: serviceProfilePayload },
        { new: true, runValidators: true }
      );
    }

    return res.status(200).json(await attachDoctorServiceProfile(doctor));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update doctor", error: error.message });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    await DoctorServiceProfile.findOneAndDelete({ doctorId: doctor._id });

    return res.status(200).json({ message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete doctor", error: error.message });
  }
};

const getMyDoctorProfile = async (req, res) => {
  try {
    const identity = await ensureDoctorIdentity(req, res);
    if (!identity) {
      return;
    }

    return res.status(200).json(toDoctorResponse(identity.doctor, identity.doctorProfile));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch doctor profile", error: error.message });
  }
};

const updateMyDoctorProfile = async (req, res) => {
  try {
    const identity = await ensureDoctorIdentity(req, res);
    if (!identity) {
      return;
    }

    const updatePayload = sanitizeDoctorPayload(req.body);
    const serviceProfilePayload = sanitizeDoctorServiceProfilePayload(req.body);

    if (updatePayload.specialization !== undefined) {
      const specialty = await resolveSpecialty(updatePayload.specialization);
      if (!specialty) {
        return res.status(400).json({ message: "Specialization must match an active specialty" });
      }

      updatePayload.specialization = specialty.name;
      updatePayload.specializationId = specialty._id;
    }

    Object.assign(identity.doctor, updatePayload);
    await identity.doctor.save();
    await identity.doctor.populate("specializationId", "name description isActive");

    Object.assign(identity.doctorProfile, serviceProfilePayload);
    await identity.doctorProfile.save();

    return res.status(200).json(toDoctorResponse(identity.doctor, identity.doctorProfile));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update doctor profile", error: error.message });
  }
};

const getMyAvailability = async (req, res) => {
  try {
    const identity = await ensureDoctorIdentity(req, res);
    if (!identity) {
      return;
    }

    return res.status(200).json({
      doctorId: identity.doctor._id,
      availableDays: identity.doctor.availableDays || [],
      availableTimeSlots: identity.doctor.availableTimeSlots || [],
      availabilitySchedule: identity.doctorProfile.availabilitySchedule || [],
      isAvailableForVideo: identity.doctor.isAvailableForVideo,
      acceptsNewAppointments: identity.doctorProfile.acceptsNewAppointments,
      supportsDigitalPrescriptions: identity.doctorProfile.supportsDigitalPrescriptions,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch doctor availability", error: error.message });
  }
};

const updateMyAvailability = async (req, res) => {
  try {
    const identity = await ensureDoctorIdentity(req, res);
    if (!identity) {
      return;
    }

    const updatePayload = sanitizeDoctorPayload(req.body);
    const serviceProfilePayload = sanitizeDoctorServiceProfilePayload(req.body);
    const availabilityFields = ["availableDays", "availableTimeSlots", "isAvailableForVideo"];
    const availabilityUpdate = Object.fromEntries(
      Object.entries(updatePayload).filter(([key]) => availabilityFields.includes(key))
    );

    Object.assign(identity.doctor, availabilityUpdate);
    await identity.doctor.save();

    Object.assign(identity.doctorProfile, serviceProfilePayload);
    await identity.doctorProfile.save();

    return res.status(200).json({
      message: "Doctor availability updated successfully",
      doctorId: identity.doctor._id,
      availableDays: identity.doctor.availableDays || [],
      availableTimeSlots: identity.doctor.availableTimeSlots || [],
      availabilitySchedule: identity.doctorProfile.availabilitySchedule || [],
      isAvailableForVideo: identity.doctor.isAvailableForVideo,
      acceptsNewAppointments: identity.doctorProfile.acceptsNewAppointments,
      supportsDigitalPrescriptions: identity.doctorProfile.supportsDigitalPrescriptions,
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
  deleteDoctor,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  getMyAvailability,
  updateMyAvailability,
};
