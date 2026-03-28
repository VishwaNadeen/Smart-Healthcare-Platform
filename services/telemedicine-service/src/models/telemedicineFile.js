const mongoose = require("mongoose");

const telemedicineFileSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    filePath: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedByRole: {
      type: String,
      enum: ["patient"],
      required: true,
      default: "patient",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.TelemedicineFile ||
  mongoose.model("TelemedicineFile", telemedicineFileSchema);
