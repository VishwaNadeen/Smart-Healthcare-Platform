
const mongoose = require("mongoose");

const participantPresenceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: "",
      trim: true,
    },
    connectedAt: {
      type: Date,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const telemedicineSessionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    doctorId: {
      type: String,
      required: true,
      trim: true,
      index: true,
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
    presence: {
      doctor: {
        type: participantPresenceSchema,
        default: () => ({}),
      },
      patient: {
        type: participantPresenceSchema,
        default: () => ({}),
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.TelemedicineSession ||
  mongoose.model("TelemedicineSession", telemedicineSessionSchema);
