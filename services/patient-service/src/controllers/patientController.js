const Patient = require("../models/patient");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const {
  registerPatientAuth,
  verifyAuthPassword,
  deleteAuthAccountByEmail,
} = require("../services/authService");

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
  let authUserCreated = false;

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

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !countryCode ||
      !phone ||
      !birthday ||
      !gender ||
      !country
    ) {
      return res.status(400).json({
        message: "All required patient registration fields must be provided",
      });
    }

    await registerPatientAuth({ firstName, lastName, email, password });
    authUserCreated = true;

    const patient = await Patient.create({
      firstName,
      lastName,
      email,
      countryCode,
      phone,
      birthday,
      gender,
      address,
      country,
    });

    res.status(201).json({
      message: "Patient created successfully. Please verify your email to continue.",
      verificationRequired: true,
      patient,
    });
  } catch (error) {
    if (authUserCreated && req.body?.email) {
      try {
        await deleteAuthAccountByEmail(req.body.email);
      } catch (rollbackError) {
        console.error(
          "Failed to roll back auth user after patient registration error:",
          rollbackError.message
        );
      }
    }

    const statusCode =
      error.response?.status ||
      (error.message && error.message.includes("already exists") ? 400 : 500);
    const errorMessage =
      error.response?.data?.message || error.message || "Failed to create patient";

    res.status(statusCode).json({
      message: statusCode === 400 ? errorMessage : "Failed to create patient",
      error: errorMessage,
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
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "Password is required to delete your profile",
      });
    }

    await verifyAuthPassword(req.token, password);

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
    const statusCode = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.message || error.message || "Failed to delete patient account";

    res.status(statusCode).json({
      message:
        statusCode === 401 || statusCode === 400
          ? errorMessage
          : "Failed to delete patient account",
      error: errorMessage,
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
