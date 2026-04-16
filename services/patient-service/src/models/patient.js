const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
      authUserId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      enum: ["Mr", "Miss", "Mrs", ""],
      trim: true,
      default: "",
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    countryCode: {
      type: String,
      required: true,
      trim: true,
      default: "+94",
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    nic: {
      type: String,
      trim: true,
      unique: true,
      uppercase: true,
      sparse: true,
    },

    birthday: {
      type: Date,
      required: true,
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    country: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      trim: true,
    },

    profileImage: {
      type: String,
      default: "",
      trim: true,
    },

    profileImagePublicId: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Patient", patientSchema);
