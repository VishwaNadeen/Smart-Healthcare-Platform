const Patient = require("../models/patient");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const {
  registerPatientAuth,
  verifyAuthPassword,
  deleteAuthAccount,
  deleteAuthAccountByEmail,
} = require("../services/authService");

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
};

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const buildPatientPayload = (body = {}) => ({
  firstName: body.firstName,
  lastName: body.lastName,
  email: normalizeEmail(body.email),
  countryCode: body.countryCode,
  phone: body.phone,
  birthday: body.birthday,
  gender: body.gender,
  address: body.address,
  country: body.country,
});

const findPatientForAuthUser = async (authUser) => {
  if (!authUser) {
    return null;
  }

  if (authUser.id) {
    const patientByAuthId = await Patient.findOne({ authUserId: authUser.id });
    if (patientByAuthId) {
      return patientByAuthId;
    }
  }

  if (authUser.email) {
    return Patient.findOne({ email: normalizeEmail(authUser.email) });
  }

  return null;
};

// Create patient with auth-service registration
const createPatient = async (req, res) => {
  let authRegistration = null;
  let createdPatient = null;

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
        message: "All required fields must be provided",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const existingPatient = await Patient.findOne({ email: normalizedEmail });
    if (existingPatient) {
      return res.status(409).json({
        message: "Patient already exists with this email",
      });
    }

    authRegistration = await registerPatientAuth({
      firstName,
      lastName,
      email: normalizedEmail,
      password,
    });

    const patientPayload = buildPatientPayload({
      firstName,
      lastName,
      email: normalizedEmail,
      countryCode,
      phone,
      birthday,
      gender,
      address,
      country,
    });

    patientPayload.authUserId = authRegistration?.user?.id || "";

    createdPatient = await Patient.create(patientPayload);

    res.status(201).json({
      message: "Patient created successfully",
      patient: createdPatient,
      verificationRequired: authRegistration?.verificationRequired,
      expiresInMinutes: authRegistration?.expiresInMinutes,
    });
  } catch (error) {
    if (!createdPatient && authRegistration?.user?.email) {
      try {
        await deleteAuthAccountByEmail(authRegistration.user.email);
      } catch (rollbackError) {
        console.error(
          "Failed to roll back auth account after patient creation failure:",
          rollbackError.message
        );
      }
    }

    const statusCode =
      error.response?.status ||
      (error.message?.includes("already exists") ? 409 : 500);

    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to create patient";

    res.status(statusCode).json({
      message: errorMessage,
      error: errorMessage,
    });
  }
};

// Get all patients
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
    const patient = await findPatientForAuthUser(req.authUser);

    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    if (!patient.authUserId && req.authUser?.id) {
      patient.authUserId = req.authUser.id;
      await patient.save();
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
    const requestedEmail = normalizeEmail(req.body.email);

    const patient = await findPatientForAuthUser(req.authUser);

    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    if (!patient.authUserId && req.authUser?.id) {
      patient.authUserId = req.authUser.id;
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
    if (!req.file) {
      return res.status(400).json({ message: "Please select an image" });
    }

    const patient = await findPatientForAuthUser(req.authUser);

    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    if (!patient.authUserId && req.authUser?.id) {
      patient.authUserId = req.authUser.id;
    }

    const oldPublicId = patient.profileImagePublicId;

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
    patient.profileImagePublicId = result.public_id;
    await patient.save();

    if (oldPublicId) {
      await deleteCloudinaryImage(oldPublicId);
    }

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
    const patient = await findPatientForAuthUser(req.authUser);

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
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "Password is required to delete your profile",
      });
    }

    await verifyAuthPassword(req.token, password);

    const patient = await findPatientForAuthUser(req.authUser);

    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    if (patient.profileImagePublicId) {
      await deleteCloudinaryImage(patient.profileImagePublicId);
    }

    await patient.deleteOne();
    await deleteAuthAccount(req.token);

    res.status(200).json({
      message: "Patient account deleted successfully",
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to delete patient account";

    res.status(statusCode).json({
      message: errorMessage,
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