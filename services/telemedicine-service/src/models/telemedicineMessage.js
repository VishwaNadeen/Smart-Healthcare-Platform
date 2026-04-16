
const mongoose = require("mongoose");

const telemedicineMessageSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ["doctor", "patient", "admin", "system"],
      required: true,
    },
    senderId: {
      type: String,
      default: "",
      trim: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.TelemedicineMessage ||
  mongoose.model("TelemedicineMessage", telemedicineMessageSchema);
