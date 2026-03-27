<<<<<<< Updated upstream
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
=======
const Doctor = require("../models/doctorModel");

// Create doctor
const createDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.create(req.body);
    res.status(201).json({ message: "Doctor created successfully", doctor });
  } catch (error) {
    res.status(500).json({ message: "Failed to create doctor", error: error.message });
  }
};

// Get all doctors with optional filters
const getDoctors = async (req, res) => {
  try {
    const { specialization, status, search } = req.query;

    const filters = {};
    if (specialization) filters.specialization = specialization;
    if (status) filters.status = status;
    if (search) filters.name = { $regex: search, $options: "i" };

    const doctors = await Doctor.find(filters).sort({ createdAt: -1 });
    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch doctors", error: error.message });
  }
};

// Get doctor by ID
const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.status(200).json(doctor);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch doctor", error: error.message });
  }
};

// Update doctor profile
const updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.status(200).json({ message: "Doctor updated successfully", doctor });
  } catch (error) {
    res.status(500).json({ message: "Failed to update doctor", error: error.message });
  }
};

// Update availability
const updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { availability },
      { new: true, runValidators: true }
    );
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.status(200).json({ message: "Availability updated", doctor });
  } catch (error) {
    res.status(500).json({ message: "Failed to update availability", error: error.message });
  }
};

// Update approval/status
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "approved", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.status(200).json({ message: "Status updated", doctor });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status", error: error.message });
  }
};

// Delete doctor
const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.status(200).json({ message: "Doctor deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete doctor", error: error.message });
>>>>>>> Stashed changes
  }
};

module.exports = {
  createDoctor,
<<<<<<< Updated upstream
  getAllDoctors,
  getDoctorById,
  updateDoctor,
=======
  getDoctors,
  getDoctorById,
  updateDoctor,
  updateAvailability,
  updateStatus,
>>>>>>> Stashed changes
  deleteDoctor,
};