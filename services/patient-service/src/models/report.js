const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    filePublicId: {
      type: String,
      required: true,
    },
    fileResourceType: {
      type: String,
      required: true,
      default: "raw",
    },
    reportType: {
      type: String,
      default: "general",
    },
    reportTitle: {
      type: String,
      required: true,
      trim: true,
    },
    providerName: {
      type: String,
      trim: true,
      default: "",
    },
    reportDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);