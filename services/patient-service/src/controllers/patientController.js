const util = require("util");
const Patient = require("../models/patient");
const { registerPatientAuth, deleteAuthAccount } = require("../services/authService");

const buildPatientPayload = (payload = {}) => {
  const {
    firstName,
    lastName,
    email,
    countryCode,
    phone,
    birthday,
    gender,
    address,
    country,
  } = payload;

  return {
    firstName,
    lastName,
    email,
    countryCode,
    phone,
    birthday,
    gender,
    address,
    country,
  };
};

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

const findAuthenticatedPatient = async (req) => {
  const email = req.authUser?.email;

  if (!email) {
    const error = new Error("Authenticated user email not found");
    error.status = 401;
    throw error;
  }

  const patient = await Patient.findOne({ email });

  if (!patient) {
    const error = new Error("Patient not found");
    error.status = 404;
    throw error;
  }

  return patient;
};

// Create patient
const createPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      countryCode,
      phone,
      birthday,
      gender,
      address,
      country,
    } = req.body;

    // check existing patient in patient DB
    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({
        message: "Patient already exists",
      });
    }

    // 1. create auth user through auth service
    await registerPatientAuth({
      firstName,
      lastName,
      email,
      password,
    });

    // 2. save patient in patient DB
    const patient = await Patient.create(
      buildPatientPayload({
        firstName,
        lastName,
        email,
        countryCode,
        phone,
        birthday,
        gender,
        address,
        country,
      })
    );

    res.status(201).json({
      message: "Patient created successfully",
      patient,
    });
  } catch (error) {
    console.error("createPatient failed:", {
      rawError: util.inspect(error, { depth: 5 }),
      errorType: typeof error,
      message: error.message,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
    });

    res.status(error.response?.status || 500).json({
      message: "Failed to create patient",
      error: extractErrorMessage(error),
    });
  }
};

// Get all patients
const getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });

    res.status(200).json(patients);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch patients",
      error: error.message,
    });
  }
};

// Get patient by ID
const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.status(200).json(patient);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch patient",
      error: error.message,
    });
  }
};

// Get current patient
const getCurrentPatient = async (req, res) => {
  try {
    const patient = await findAuthenticatedPatient(req);

    res.status(200).json(patient);
  } catch (error) {
    res.status(error.status || 500).json({
      message: "Failed to fetch patient profile",
      error: error.message,
    });
  }
};

// Update current patient
const updateCurrentPatient = async (req, res) => {
  try {
    const currentPatient = await findAuthenticatedPatient(req);

    const patient = await Patient.findByIdAndUpdate(currentPatient._id, buildPatientPayload(req.body), {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      message: "Patient updated successfully",
      patient,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      message: "Failed to update patient",
      error: error.message,
    });
  }
};

// Delete current patient
const deleteCurrentPatient = async (req, res) => {
  try {
    const currentPatient = await findAuthenticatedPatient(req);
    await deleteAuthAccount(req.token);
    await Patient.findByIdAndDelete(currentPatient._id);

    res.status(200).json({
      message: "Patient account deleted successfully",
    });
  } catch (error) {
    res.status(error.response?.status || error.status || 500).json({
      message: "Failed to delete patient",
      error: extractErrorMessage(error),
    });
  }
};

module.exports = {
  createPatient,
  getAllPatients,
  getCurrentPatient,
  getPatientById,
  updateCurrentPatient,
  deleteCurrentPatient,
};
