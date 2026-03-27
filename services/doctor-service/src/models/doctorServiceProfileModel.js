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

const doctorServiceProfileSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      unique: true,
      index: true,
    },
    authUserId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      select: false,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("DoctorServiceProfile", doctorServiceProfileSchema);
