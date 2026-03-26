const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
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
);

module.exports = mongoose.model("Doctor", doctorSchema);