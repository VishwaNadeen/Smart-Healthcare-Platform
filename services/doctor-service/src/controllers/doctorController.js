const util = require("util");
const Doctor = require("../models/doctorModel");
const Specialty = require("../models/specialtyModel");
const { registerDoctorAuth } = require("../services/authService");

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

const sanitizeDoctorPayload = (payload) =>
  Object.fromEntries(Object.entries(payload).filter(([key]) => doctorAllowedFields.includes(key)));

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

const createDoctor = async (req, res) => {
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

    const doctorData = {
      ...doctorPayload,
      specialization: specialty.name,
      specializationId: specialty._id,
    };

    await registerDoctorAuth({ fullName, email, password });

    const doctor = await Doctor.create(doctorData);
    return res.status(201).json(doctor);
  } catch (error) {
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
    const doctors = await Doctor.find().populate("specializationId", "name description isActive");
    return res.status(200).json(doctors);
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

    return res.status(200).json(doctor);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch doctor", error: error.message });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const updatePayload = sanitizeDoctorPayload(req.body);

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

    return res.status(200).json(doctor);
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

    return res.status(200).json({ message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete doctor", error: error.message });
  }
};

module.exports = {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};