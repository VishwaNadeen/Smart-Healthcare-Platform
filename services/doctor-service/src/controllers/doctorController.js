const streamifier = require("streamifier");
const Doctor = require("../models/doctorModel");
const Specialty = require("../models/specialtyModel");
const cloudinary = require("../config/cloudinary");
const {
  registerDoctorAuth,
  deleteAuthAccountByEmail,
} = require("../services/authService");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const APPOINTMENT_DURATION_MINUTES = 15;

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
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

  return [
    ...new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  ];
};

const sanitizeAvailabilitySchedule = (slots) => {
  if (!Array.isArray(slots)) return undefined;

  return slots
    .map((slot) => ({
      day: String(slot?.day || "").trim(),
      startTime: String(slot?.startTime || "").trim(),
      endTime: String(slot?.endTime || "").trim(),
      mode: ["in_person", "video", "both"].includes(slot?.mode)
        ? slot.mode
        : "in_person",
      maxAppointments:
        Number(slot?.maxAppointments) > 0 ? Number(slot.maxAppointments) : 1,
    }))
    .filter((slot) => slot.day && slot.startTime && slot.endTime);
};

const toMinutes = (time) => {
  const [hours, minutes] = String(time || "")
    .split(":")
    .map((value) => Number(value));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return NaN;
  }

  return hours * 60 + minutes;
};

const getAvailabilityOverlapMessage = (slots = []) => {
  const groupedByDay = new Map();

  for (const slot of slots) {
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);

    if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
      return `Invalid time range for ${slot.day || "selected day"}. End time must be later than start time.`;
    }

    if (end - start < APPOINTMENT_DURATION_MINUTES) {
      return `Invalid time range for ${slot.day || "selected day"}. Each slot must allow at least ${APPOINTMENT_DURATION_MINUTES} minutes.`;
    }

    const daySlots = groupedByDay.get(slot.day) || [];
    daySlots.push(slot);
    groupedByDay.set(slot.day, daySlots);
  }

  for (const [day, daySlots] of groupedByDay.entries()) {
    const sortedSlots = [...daySlots].sort(
      (left, right) => toMinutes(left.startTime) - toMinutes(right.startTime)
    );

    for (let index = 1; index < sortedSlots.length; index += 1) {
      const previous = sortedSlots[index - 1];
      const current = sortedSlots[index];

      if (toMinutes(current.startTime) < toMinutes(previous.endTime)) {
        return `${day} has overlapping time slots. Please adjust the times so they do not overlap.`;
      }
    }
  }

  return "";
};

const withCalculatedSlotCapacities = (slots = []) =>
  slots.map((slot) => ({
    ...slot,
    maxAppointments: Math.max(
      1,
      Math.floor(
        (toMinutes(slot.endTime) - toMinutes(slot.startTime)) /
          APPOINTMENT_DURATION_MINUTES
      )
    ),
  }));

const sanitizePayloadWithAllowedFields = (payload = {}, allowedFields = []) => {
  const sanitized = Object.fromEntries(
    Object.entries(payload).filter(([key]) => allowedFields.includes(key))
  );

  if (sanitized.email !== undefined) {
    sanitized.email = String(sanitized.email).trim().toLowerCase();
  }
  if (sanitized.fullName !== undefined) {
    sanitized.fullName = String(sanitized.fullName).trim();
  }
  if (sanitized.phone !== undefined) {
    sanitized.phone = String(sanitized.phone).trim();
  }
  if (sanitized.specialization !== undefined) {
    sanitized.specialization = String(sanitized.specialization).trim();
  }
  if (sanitized.qualification !== undefined) {
    sanitized.qualification = String(sanitized.qualification).trim();
  }
  if (sanitized.licenseNumber !== undefined) {
    sanitized.licenseNumber = String(sanitized.licenseNumber).trim();
  }
  if (sanitized.hospitalName !== undefined) {
    sanitized.hospitalName = String(sanitized.hospitalName).trim();
  }
  if (sanitized.hospitalAddress !== undefined) {
    sanitized.hospitalAddress = String(sanitized.hospitalAddress).trim();
  }
  if (sanitized.city !== undefined) {
    sanitized.city = String(sanitized.city).trim();
  }
  if (sanitized.about !== undefined) {
    sanitized.about = String(sanitized.about).trim();
  }
  if (sanitized.profileImage !== undefined) {
    sanitized.profileImage = String(sanitized.profileImage).trim();
  }
  if (sanitized.verificationNote !== undefined) {
    sanitized.verificationNote = String(sanitized.verificationNote).trim();
  }
  if (sanitized.experience !== undefined && sanitized.experience !== "") {
    sanitized.experience = Number(sanitized.experience);
  }
  if (
    sanitized.consultationFee !== undefined &&
    sanitized.consultationFee !== ""
  ) {
    sanitized.consultationFee = Number(sanitized.consultationFee);
  }
  if (sanitized.availableDays !== undefined) {
    sanitized.availableDays = sanitizeStringArray(sanitized.availableDays);
  }
  if (sanitized.availableTimeSlots !== undefined) {
    sanitized.availableTimeSlots = sanitizeStringArray(
      sanitized.availableTimeSlots
    );
  }
  if (sanitized.availabilitySchedule !== undefined) {
    sanitized.availabilitySchedule = sanitizeAvailabilitySchedule(
      sanitized.availabilitySchedule
    );
  }

  const isAvailableForVideo = parseBoolean(sanitized.isAvailableForVideo);
  if (isAvailableForVideo !== undefined) {
    sanitized.isAvailableForVideo = isAvailableForVideo;
  }

  const supportsDigitalPrescriptions = parseBoolean(
    sanitized.supportsDigitalPrescriptions
  );
  if (supportsDigitalPrescriptions !== undefined) {
    sanitized.supportsDigitalPrescriptions = supportsDigitalPrescriptions;
  }

  const acceptsNewAppointments = parseBoolean(
    sanitized.acceptsNewAppointments
  );
  if (acceptsNewAppointments !== undefined) {
    sanitized.acceptsNewAppointments = acceptsNewAppointments;
  }

  if (sanitized.status !== undefined) {
    sanitized.status = String(sanitized.status).trim().toLowerCase();
  }

  return sanitized;
};

const sanitizeDoctorPayload = (payload = {}) =>
  sanitizePayloadWithAllowedFields(payload, doctorAllowedFields);

const resolveSpecialty = async (specializationName) => {
  const normalizedName = String(specializationName || "").trim();
  if (!normalizedName) return null;

  return Specialty.findOne({
    name: { $regex: new RegExp(`^${escapeRegExp(normalizedName)}$`, "i") },
    isActive: { $ne: false },
  });
};

const findDoctorByAuthUserId = async (authUserId, email) => {
  if (authUserId) {
    const byAuthUserId = await Doctor.findOne({ authUserId })
      .select("+authUserId +profileImagePublicId")
      .populate("specializationId", "name description isActive");

    if (byAuthUserId) return byAuthUserId;
  }

  if (email) {
    return Doctor.findOne({ email: String(email).toLowerCase() })
      .select("+authUserId +profileImagePublicId")
      .populate("specializationId", "name description isActive");
  }

  return null;
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

  const doctor = await findDoctorByAuthUserId(req.user.id, req.user.email);
  if (!doctor) {
    res.status(404).json({
      message: "Doctor profile not found for this account",
    });
    return null;
  }

  return doctor;
};

const toDoctorResponse = (doctorDocument, options = {}) => {
  if (!doctorDocument) {
    return doctorDocument;
  }

  const doctor = doctorDocument.toObject
    ? doctorDocument.toObject()
    : { ...doctorDocument };

  if (!options.includeAuthUserId) {
    delete doctor.authUserId;
  }

  delete doctor.profileImagePublicId;
  return doctor;
};

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
};

const uploadProfileImageFromBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });

const createDoctor = async (req, res) => {
  let authUserCreated = false;
  let normalizedEmail = "";
  let uploadedProfileImagePublicId = null;

  try {
    const doctorPayload = sanitizeDoctorPayload(req.body);
    const password = String(req.body?.password || "").trim();

    if (doctorPayload.availabilitySchedule !== undefined) {
      const overlapMessage = getAvailabilityOverlapMessage(
        doctorPayload.availabilitySchedule
      );

      if (overlapMessage) {
        return res.status(400).json({ message: overlapMessage });
      }

      doctorPayload.availabilitySchedule = withCalculatedSlotCapacities(
        doctorPayload.availabilitySchedule
      );
    }

    if (!doctorPayload.fullName || !doctorPayload.email || !password) {
      return res.status(400).json({
        message: "Full name, email and password are required",
      });
    }

    normalizedEmail = doctorPayload.email.toLowerCase();

    const existingDoctor = await Doctor.findOne({
      email: normalizedEmail,
    });

    if (existingDoctor) {
      return res.status(409).json({
        message: "Doctor profile already exists with this email",
      });
    }

    const specialty = await resolveSpecialty(doctorPayload.specialization);
    if (!specialty) {
      return res.status(400).json({
        message: "Specialization must match an active specialty",
      });
    }

    const authResponse = await registerDoctorAuth({
      fullName: doctorPayload.fullName,
      email: normalizedEmail,
      password,
    });

    authUserCreated = true;

    const authUserId =
      authResponse?.user?._id ||
      authResponse?.user?.id ||
      authResponse?.userId ||
      null;

    if (req.file?.buffer) {
      const profileImageUpload = await uploadProfileImageFromBuffer(
        req.file.buffer,
        "smart-healthcare/doctor-profiles"
      );

      uploadedProfileImagePublicId = profileImageUpload.public_id;
      doctorPayload.profileImage = profileImageUpload.secure_url;
      doctorPayload.profileImagePublicId = profileImageUpload.public_id;
    }

    const doctorData = {
      ...doctorPayload,
      email: normalizedEmail,
      specialization: specialty.name,
      specializationId: specialty._id,
      status: "inactive",
      verificationStatus: "pending",
      verificationNote: "",
      verifiedAt: null,
    };

    if (authUserId) {
      doctorData.authUserId = String(authUserId);
    }

    const doctor = await Doctor.create(doctorData);

    return res.status(201).json({
      message:
        authResponse?.message ||
        "Doctor account created successfully. Please verify your email to continue.",
      verificationRequired: authResponse?.verificationRequired ?? true,
      expiresInMinutes: authResponse?.expiresInMinutes,
      doctor: toDoctorResponse(doctor),
    });
  } catch (error) {
    if (uploadedProfileImagePublicId) {
      try {
        await deleteCloudinaryImage(uploadedProfileImagePublicId);
      } catch (cloudinaryError) {
        console.error(
          "createDoctor image rollback failed:",
          cloudinaryError.message
        );
      }
    }

    if (authUserCreated && normalizedEmail) {
      try {
        await deleteAuthAccountByEmail(normalizedEmail);
      } catch (rollbackError) {
        console.error(
          "Failed to roll back auth user after doctor creation error:",
          rollbackError.message
        );
      }
    }

    const status =
      error?.response?.status ||
      (error.message && error.message.toLowerCase().includes("already")
        ? 409
        : 500);

    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      "Failed to create doctor";

    return res.status(status).json({
      message,
      error: message,
    });
  }
};

const getAllDoctors = async (req, res) => {
  try {
    const {
      specialization,
      city,
      status,
      isAvailableForVideo,
      acceptsNewAppointments,
    } = req.query;

    const query = {};

    if (specialization) {
      query.specialization = {
        $regex: new RegExp(
          `^${escapeRegExp(String(specialization).trim())}$`,
          "i"
        ),
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

    const doctors = await Doctor.find(query).populate(
      "specializationId",
      "name description isActive"
    );

    return res.status(200).json(doctors.map(toDoctorResponse));
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch doctors",
      error: error.message,
    });
  }
};

const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate(
      "specializationId",
      "name description isActive"
    );

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    return res.status(200).json(toDoctorResponse(doctor));
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch doctor",
      error: error.message,
    });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const updatePayload = sanitizePayloadWithAllowedFields(
      req.body,
      adminDoctorAllowedFields
    );

    if (updatePayload.availabilitySchedule !== undefined) {
      const overlapMessage = getAvailabilityOverlapMessage(
        updatePayload.availabilitySchedule
      );

      if (overlapMessage) {
        return res.status(400).json({ message: overlapMessage });
      }

      updatePayload.availabilitySchedule = withCalculatedSlotCapacities(
        updatePayload.availabilitySchedule
      );
    }

    if (updatePayload.specialization !== undefined) {
      const specialty = await resolveSpecialty(updatePayload.specialization);

      if (!specialty) {
        return res.status(400).json({
          message: "Specialization must match an active specialty",
        });
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
    return res.status(500).json({
      message: "Failed to update doctor",
      error: error.message,
    });
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
      .select("+authUserId")
      .populate("specializationId", "name description isActive")
      .sort({ createdAt: -1 });

    return res.status(200).json(
      doctors.map((doctor) =>
        toDoctorResponse(doctor, { includeAuthUserId: true })
      )
    );
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch doctor verifications",
      error: error.message,
    });
  }
};

const updateDoctorVerification = async (req, res) => {
  try {
    const verificationStatus = String(
      req.body?.verificationStatus || ""
    ).trim().toLowerCase();
    const verificationNote =
      req.body?.verificationNote === undefined
        ? undefined
        : String(req.body.verificationNote || "").trim();

    if (!["pending", "approved", "rejected"].includes(verificationStatus)) {
      return res.status(400).json({
        message: "verificationStatus must be pending, approved or rejected",
      });
    }

    const doctor = await Doctor.findById(req.params.id)
      .select("+authUserId")
      .populate("specializationId", "name description isActive");

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    doctor.verificationStatus = verificationStatus;
    doctor.status = verificationStatus === "approved" ? "active" : "inactive";
    doctor.verificationNote =
      verificationNote !== undefined ? verificationNote : doctor.verificationNote;
    doctor.verifiedAt = new Date();
    await doctor.save();

    return res.status(200).json({
      message: `Doctor ${verificationStatus} successfully`,
      doctor: toDoctorResponse(doctor, { includeAuthUserId: true }),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update doctor verification",
      error: error.message,
    });
  }
};

const uploadMyDoctorProfileImage = async (req, res) => {
  try {
    const doctor = await ensureDoctorIdentity(req, res);
    if (!doctor) {
      return;
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Please select an image",
      });
    }

    const result = await uploadProfileImageFromBuffer(
      req.file.buffer,
      "smart-healthcare/doctor-profiles"
    );

    if (doctor.profileImagePublicId) {
      await deleteCloudinaryImage(doctor.profileImagePublicId);
    }

    doctor.profileImage = result.secure_url;
    doctor.profileImagePublicId = result.public_id;
    await doctor.save();

    return res.status(200).json({
      message: "Profile image uploaded successfully",
      profileImage: result.secure_url,
      doctor: toDoctorResponse(doctor),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to upload doctor profile image",
      error: error.message,
    });
  }
};

const removeMyDoctorProfileImage = async (req, res) => {
  try {
    const doctor = await ensureDoctorIdentity(req, res);
    if (!doctor) {
      return;
    }

    if (doctor.profileImagePublicId) {
      await deleteCloudinaryImage(doctor.profileImagePublicId);
    }

    doctor.profileImage = "";
    doctor.profileImagePublicId = "";
    await doctor.save();

    return res.status(200).json({
      message: "Profile image removed successfully",
      doctor: toDoctorResponse(doctor),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to remove doctor profile image",
      error: error.message,
    });
  }
};

const deleteMyDoctorProfile = async (req, res) => {
  try {
    const doctor = await ensureDoctorIdentity(req, res);
    if (!doctor) return;

    const doctorEmail = doctor.email;

    if (doctor.profileImagePublicId) {
      await deleteCloudinaryImage(doctor.profileImagePublicId);
    }

    await doctor.deleteOne();

    let authDeleteResult = null;

    try {
      authDeleteResult = await deleteAuthAccountByEmail(doctorEmail);
    } catch (authError) {
      return res.status(500).json({
        message:
          "Doctor profile deleted, but failed to delete auth account. Please clean up auth-service manually.",
        error: authError?.response?.data?.message || authError.message,
      });
    }

    return res.status(200).json({
      message: "Doctor profile and auth account deleted successfully",
      authDeleteResult,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete doctor profile",
      error: error.message,
    });
  }
};

const getMyDoctorProfile = async (req, res) => {
  try {
    const doctor = await ensureDoctorIdentity(req, res);
    if (!doctor) return;

    return res.status(200).json(toDoctorResponse(doctor));
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch doctor profile",
      error: error.message,
    });
  }
};

const updateMyDoctorProfile = async (req, res) => {
  try {
    const doctor = await ensureDoctorIdentity(req, res);
    if (!doctor) return;

    const updatePayload = sanitizeDoctorPayload(req.body);

    if (updatePayload.availabilitySchedule !== undefined) {
      const overlapMessage = getAvailabilityOverlapMessage(
        updatePayload.availabilitySchedule
      );

      if (overlapMessage) {
        return res.status(400).json({ message: overlapMessage });
      }

      updatePayload.availabilitySchedule = withCalculatedSlotCapacities(
        updatePayload.availabilitySchedule
      );
    }

    if (
      updatePayload.email &&
      req.user?.email &&
      updatePayload.email !== req.user.email.toLowerCase()
    ) {
      return res.status(400).json({
        message: "Email cannot be changed from doctor profile service",
      });
    }

    if (updatePayload.specialization !== undefined) {
      const specialty = await resolveSpecialty(updatePayload.specialization);

      if (!specialty) {
        return res.status(400).json({
          message: "Specialization must match an active specialty",
        });
      }

      updatePayload.specialization = specialty.name;
      updatePayload.specializationId = specialty._id;
    }

    Object.assign(doctor, updatePayload);
    await doctor.save();
    await doctor.populate("specializationId", "name description isActive");

    return res.status(200).json(toDoctorResponse(doctor));
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update doctor profile",
      error: error.message,
    });
  }
};

const getMyAvailability = async (req, res) => {
  try {
    const doctor = await ensureDoctorIdentity(req, res);
    if (!doctor) return;

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
    return res.status(500).json({
      message: "Failed to fetch doctor availability",
      error: error.message,
    });
  }
};

const updateMyAvailability = async (req, res) => {
  try {
    const doctor = await ensureDoctorIdentity(req, res);
    if (!doctor) return;

    const updatePayload = sanitizeDoctorPayload({
      availableDays: req.body.availableDays,
      availableTimeSlots: req.body.availableTimeSlots,
      availabilitySchedule: req.body.availabilitySchedule,
      isAvailableForVideo: req.body.isAvailableForVideo,
      acceptsNewAppointments: req.body.acceptsNewAppointments,
      supportsDigitalPrescriptions: req.body.supportsDigitalPrescriptions,
    });

    if (updatePayload.availabilitySchedule !== undefined) {
      const overlapMessage = getAvailabilityOverlapMessage(
        updatePayload.availabilitySchedule
      );

      if (overlapMessage) {
        return res.status(400).json({ message: overlapMessage });
      }

      updatePayload.availabilitySchedule = withCalculatedSlotCapacities(
        updatePayload.availabilitySchedule
      );
    }

    Object.assign(doctor, updatePayload);
    await doctor.save();

    return res.status(200).json({
      message: "Doctor availability updated successfully",
      availability: {
        doctorId: doctor._id,
        availableDays: doctor.availableDays || [],
        availableTimeSlots: doctor.availableTimeSlots || [],
        availabilitySchedule: doctor.availabilitySchedule || [],
        isAvailableForVideo: doctor.isAvailableForVideo,
        acceptsNewAppointments: doctor.acceptsNewAppointments,
        supportsDigitalPrescriptions: doctor.supportsDigitalPrescriptions,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update doctor availability",
      error: error.message,
    });
  }
};

module.exports = {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  getDoctorsForVerification,
  updateDoctorVerification,
  uploadMyDoctorProfileImage,
  removeMyDoctorProfileImage,
  deleteMyDoctorProfile,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  getMyAvailability,
  updateMyAvailability,
};
