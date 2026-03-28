const Patient = require("../models/patient");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const {
  registerPatientAuth,
  deleteAuthAccountByEmail,
} = require("../services/authService");

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const createPatient = async (req, res) => {
  let authUserCreated = false;
  let normalizedEmail = "";

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
    } = req.body || {};

    normalizedEmail = normalizeEmail(email);

    if (
      !firstName ||
      !lastName ||
      !normalizedEmail ||
      !password ||
      !countryCode ||
      !phone ||
      !birthday ||
      !gender ||
      !country
    ) {
      return res.status(400).json({
        message:
          "firstName, lastName, email, password, countryCode, phone, birthday, gender and country are required",
      });
    }

    const existingPatient = await Patient.findOne({ email: normalizedEmail });

    if (existingPatient) {
      return res.status(409).json({
        message: "Patient already exists with this email",
      });
    }

    const authResponse = await registerPatientAuth({
      firstName,
      lastName,
      email: normalizedEmail,
      password,
    });

    authUserCreated = true;

    const patient = await Patient.create({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: normalizedEmail,
      countryCode: String(countryCode).trim(),
      phone: String(phone).trim(),
      birthday,
      gender: String(gender).trim().toLowerCase(),
      address: String(address || "").trim(),
      country: String(country).trim(),
    });

    return res.status(201).json({
      message:
        authResponse?.message ||
        "Patient account created successfully. Please verify your email to continue.",
      verificationRequired: authResponse?.verificationRequired ?? true,
      expiresInMinutes: authResponse?.expiresInMinutes,
      patient,
    });
  } catch (error) {
    /*
      Roll back auth user if auth account was created
      but patient profile creation failed after that
    */
    if (authUserCreated && normalizedEmail) {
      try {
        await deleteAuthAccountByEmail(normalizedEmail);
      } catch (rollbackError) {
        console.error(
          "Failed to roll back auth user after patient creation error:",
          rollbackError.message
        );
      }
    }

    const status =
      error?.response?.status ||
      (error.message && error.message.toLowerCase().includes("already exists")
        ? 409
        : 500);

    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      "Failed to create patient";

    return res.status(status).json({
      message,
      error: message,
    });
  }
};

const getAllPatients = async (_req, res) => {
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

const getCurrentPatient = async (req, res) => {
  try {
    const email = req.authUser.email;
    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    res.status(200).json(patient);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch current patient",
      error: error.message,
    });
  }
};

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

const updateCurrentPatient = async (req, res) => {
  try {
    const email = req.authUser.email;
    const requestedEmail =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    if (requestedEmail && requestedEmail !== patient.email) {
      return res.status(400).json({
        message: "Email address cannot be changed from the patient profile.",
      });
    }

    patient.firstName = req.body.firstName ?? patient.firstName;
    patient.lastName = req.body.lastName ?? patient.lastName;
    patient.countryCode = req.body.countryCode ?? patient.countryCode;
    patient.phone = req.body.phone ?? patient.phone;
    patient.birthday = req.body.birthday ?? patient.birthday;
    patient.gender = req.body.gender ?? patient.gender;
    patient.address = req.body.address ?? patient.address;
    patient.country = req.body.country ?? patient.country;

    const updatedPatient = await patient.save();

    res.status(200).json({
      message: "Patient profile updated successfully",
      patient: updatedPatient,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update patient profile",
      error: error.message,
    });
  }
};

const uploadCurrentPatientProfileImage = async (req, res) => {
  try {
    const email = req.authUser.email;

    if (!req.file) {
      return res.status(400).json({ message: "Please select an image" });
    }

    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    const uploadFromBuffer = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "smart-healthcare/patient-profiles",
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

    const result = await uploadFromBuffer();

    if (patient.profileImagePublicId) {
      await deleteCloudinaryImage(patient.profileImagePublicId);
    }

    patient.profileImage = result.secure_url;
    patient.profileImagePublicId = result.public_id;
    await patient.save();

    res.status(200).json({
      message: "Profile image uploaded successfully",
      profileImage: result.secure_url,
      patient,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to upload profile image",
      error: error.message,
    });
  }
};

const removeCurrentPatientProfileImage = async (req, res) => {
  try {
    const email = req.authUser.email;
    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    if (patient.profileImagePublicId) {
      await deleteCloudinaryImage(patient.profileImagePublicId);
    }

    patient.profileImage = "";
    patient.profileImagePublicId = "";
    await patient.save();

    res.status(200).json({
      message: "Profile image removed successfully",
      patient,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove profile image",
      error: error.message,
    });
  }
};

const deleteCurrentPatient = async (req, res) => {
  try {
    const email = req.authUser.email;
    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    if (patient.profileImagePublicId) {
      await deleteCloudinaryImage(patient.profileImagePublicId);
    }

    await patient.deleteOne();

    res.status(200).json({
      message:
        "Patient profile deleted successfully. Delete the auth account separately through auth-service if needed.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete patient profile",
      error: error.message,
    });
  }
};

module.exports = {
  createPatient,
  getAllPatients,
  getCurrentPatient,
  getPatientById,
  updateCurrentPatient,
  uploadCurrentPatientProfileImage,
  removeCurrentPatientProfileImage,
  deleteCurrentPatient,
};