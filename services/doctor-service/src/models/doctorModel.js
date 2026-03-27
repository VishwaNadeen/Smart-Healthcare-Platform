const mongoose = require("mongoose");

<<<<<<< Updated upstream
const doctorSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
=======
const slotSchema = new mongoose.Schema(
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

const availabilitySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
      trim: true,
    },
    slots: {
      type: [slotSchema],
      default: [],
    },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
>>>>>>> Stashed changes
    },
    email: {
      type: String,
      required: true,
<<<<<<< Updated upstream
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

    profileImage: String,
    about: String,

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
=======
      trim: true,
      unique: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    specialization: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    experienceYears: {
      type: Number,
      min: 0,
      default: 0,
    },
    availability: {
      type: [availabilitySchema],
      default: [],
    },
    consultationModes: {
      type: [String],
      enum: ["in-person", "virtual"],
      default: ["virtual"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
  },
  {
    timestamps: true,
  }
>>>>>>> Stashed changes
);

module.exports = mongoose.model("Doctor", doctorSchema);