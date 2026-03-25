const mongoose = require("mongoose");

const telemedicineSessionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: true,
      trim: true,
    },
    patientId: {
      type: String,
      required: true,
      trim: true,
    },
    doctorId: {
      type: String,
      required: true,
      trim: true,
    },
    roomName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    meetingLink: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledDate: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledTime: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "cancelled"],
      default: "scheduled",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TelemedicineSession", telemedicineSessionSchema);