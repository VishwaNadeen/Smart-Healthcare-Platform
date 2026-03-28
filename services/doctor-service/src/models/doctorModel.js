const mongoose = require("mongoose");

const availabilitySlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    mode: {
      type: String,
      enum: ["in_person", "video", "both"],
      default: "in_person",
    },
    maxAppointments: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    authUserId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      select: false,
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },

    specialization: {
      type: String,
      required: true,
    },
    specializationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Specialty",
    },
    experience: {
      type: Number,
      required: true,
    },
    qualification: {
      type: String,
      required: true,
    },
    licenseNumber: {
      type: String,
      required: true,
    },

    hospitalName: String,
    hospitalAddress: String,
    city: String,

    availableDays: [String],
    availableTimeSlots: [String],

    consultationFee: Number,
    isAvailableForVideo: {
      type: Boolean,
      default: false,
    },
    availabilitySchedule: {
      type: [availabilitySlotSchema],
      default: [],
    },
    supportsDigitalPrescriptions: {
      type: Boolean,
      default: true,
    },
    acceptsNewAppointments: {
      type: Boolean,
      default: true,
    },

    profileImage: String,
    about: String,

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    verificationNote: {
      type: String,
      trim: true,
      default: "",
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);
