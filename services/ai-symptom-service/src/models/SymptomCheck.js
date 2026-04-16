const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const symptomCheckSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    symptoms: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    analysis: {
      urgency: {
        type: String,
        enum: ["low", "medium", "high"],
        required: true,
      },
      category: {
        type: String,
        required: true,
        trim: true,
      },
      department: {
        type: String,
        required: true,
        trim: true,
      },
      nextStep: {
        type: String,
        required: true,
        trim: true,
      },
      redFlags: {
        type: [String],
        default: [],
      },
      disclaimer: {
        type: String,
        required: true,
        trim: true,
      },
    },

    recommendation: {
      shouldBookAppointment: {
        type: Boolean,
        default: false,
      },
      shouldStartTelemedicine: {
        type: Boolean,
        default: false,
      },
      emergency: {
        type: Boolean,
        default: false,
      },
    },

    aiExplanation: {
      type: String,
      default: "",
      trim: true,
    },

    chatHistory: {
      type: [chatMessageSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["completed", "follow_up_pending", "closed"],
      default: "completed",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SymptomCheck", symptomCheckSchema);