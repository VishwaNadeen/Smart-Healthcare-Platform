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

const blockedTimeRangeSchema = new mongoose.Schema(
  {
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
  },
  { _id: false }
);

const availabilityExceptionSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      trim: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedTimeRanges: {
      type: [blockedTimeRangeSchema],
      default: [],
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const reviewNoteSchema = new mongoose.Schema(
  {
    note: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-review", "approved", "rejected"],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdByName: {
      type: String,
      default: "",
      trim: true,
    },
    createdByEmail: {
      type: String,
      default: "",
      trim: true,
    },
    editableFields: {
      type: [String],
      default: [],
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
    appointmentDurationMinutes: {
      type: Number,
      default: 15,
      min: 5,
    },
    availabilitySchedule: {
      type: [availabilitySlotSchema],
      default: [],
    },
    availabilityExceptions: {
      type: [availabilityExceptionSchema],
      default: [],
    },
    acceptsNewAppointments: {
      type: Boolean,
      default: true,
    },

    profileImage: String,
    profileImagePublicId: {
      type: String,
      default: "",
      select: false,
    },
    about: String,

    verificationStatus: {
      type: String,
      enum: ["pending", "in-review","approved", "rejected"],
      default: "pending",
    },
    verificationNote: {
      type: String,
      trim: true,
      default: "",
    },
    reviewNotes: {
      type: [reviewNoteSchema],
      default: [],
    },
    editableFields: {
      type: [String],
      default: [],
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);
