const Patient = require("../models/patient");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const { registerPatientAuth, deleteAuthAccountByEmail } = require("../services/authService");

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

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
};

// Create patient
const createPatient = async (req, res) => {
  let shouldRollbackAuthUser = false;
  let rollbackEmail = null;

  try {
    const normalizedEmail =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;

    if (
      !req.body?.firstName ||
      !req.body?.lastName ||
      !normalizedEmail ||
      !password ||
      !req.body?.countryCode ||
      !req.body?.phone ||
      !req.body?.birthday ||
      !req.body?.gender ||
      !req.body?.country
    ) {
      return res.status(400).json({
        message: "All required patient fields must be provided",
      });
    }

    const existingPatient = await Patient.findOne({ email: normalizedEmail });
    if (existingPatient) {
      return res.status(400).json({
        message: "Patient already exists",
      });
    }

    const authRegistration = await registerPatientAuth({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: normalizedEmail,
      password,
    });

    shouldRollbackAuthUser = true;
    rollbackEmail = normalizedEmail;

    const patientPayload = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: normalizedEmail,
      countryCode: req.body.countryCode,
      phone: req.body.phone,
      birthday: req.body.birthday,
      gender: req.body.gender,
      address: req.body.address,
      country: req.body.country,
    };

    const patient = await Patient.create(patientPayload);
    shouldRollbackAuthUser = false;

    res.status(201).json({
      message: "Patient account created successfully. Please verify your email to continue.",
      patient,
      verificationRequired: authRegistration?.verificationRequired,
      expiresInMinutes: authRegistration?.expiresInMinutes,
    });
  } catch (error) {
    if (shouldRollbackAuthUser && rollbackEmail) {
      try {
        await deleteAuthAccountByEmail(rollbackEmail);
      } catch (rollbackError) {
        console.error("createPatient rollback failed:", rollbackError.message);
      }
    }

    res.status(error?.response?.status || 500).json({
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

// Get current patient
const getCurrentPatient = async (req, res) => {
  try {
    const email = req.authUser.email;

    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).json({
        message: "Patient profile not found",
      });
    }

    res.status(200).json(patient);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch current patient",
      error: error.message,
    });
  }
};

// Get patient by ID
const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        message: "Patient not found",
      });
    }

    res.status(200).json(patient);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch patient",
      error: error.message,
    });
  }
};

// Update current patient
const updateCurrentPatient = async (req, res) => {
  try {
    const email = req.authUser.email;
    const requestedEmail =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).json({
        message: "Patient profile not found",
      });
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

// Upload current patient profile image
const uploadCurrentPatientProfileImage = async (req, res) => {
  try {
    const email = req.authUser.email;

    if (!req.file) {
      return res.status(400).json({
        message: "Please select an image",
      });
    }

    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).json({
        message: "Patient profile not found",
      });
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

    patient.profileImage = result.secure_url;
    if (patient.profileImagePublicId) {
      await deleteCloudinaryImage(patient.profileImagePublicId);
    }
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

// Remove current patient profile image
const removeCurrentPatientProfileImage = async (req, res) => {
  try {
    const email = req.authUser.email;

    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).json({
        message: "Patient profile not found",
      });
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

// Delete current patient
const deleteCurrentPatient = async (req, res) => {
  try {
    const email = req.authUser.email;

    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).json({
        message: "Patient profile not found",
      });
    }

    if (patient.profileImagePublicId) {
      await deleteCloudinaryImage(patient.profileImagePublicId);
    }

    await patient.deleteOne();

    res.status(200).json({
      message: "Patient account deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete patient account",
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
