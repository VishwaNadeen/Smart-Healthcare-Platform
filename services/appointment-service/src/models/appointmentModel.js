const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
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
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: true,
      trim: true,
    },
    appointmentDate: {
      type: String,
      required: true,
      trim: true,
    },
    appointmentTime: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    active: {
      type: Boolean,
      default: false,   // hidden until payment confirmed
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["pending", "confirmed", "completed", "cancelled"],
          required: true,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          trim: true,
          default: "",
        },
      },
    ],
    rescheduleStatus: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },
      rescheduledDate: {
        type: String,
        default: null,
      },
      rescheduledTime: {
        type: String,
        default: null,
      },
      rescheduledAt: {
        type: Date,
        default: null,
      },

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);