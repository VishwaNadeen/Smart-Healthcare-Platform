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

const analysisSchema = new mongoose.Schema(
  {
    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    nextStep: {
      type: String,
      trim: true,
      default: "",
    },
    redFlags: {
      type: [String],
      default: [],
    },
    disclaimer: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
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

    flowType: {
      type: String,
      enum: ["form", "chat"],
      default: "chat",
    },

    conversationStage: {
      type: String,
      enum: ["collecting", "completed", "closed"],
      default: "collecting",
      index: true,
    },

    initialMessage: {
      type: String,
      default: "",
      trim: true,
    },

    currentQuestionId: {
      type: String,
      default: "",
      trim: true,
    },

    symptoms: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    analysis: {
      type: analysisSchema,
      default: () => ({}),
    },

    recommendation: {
      type: recommendationSchema,
      default: () => ({}),
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
      default: "follow_up_pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SymptomCheck", symptomCheckSchema);