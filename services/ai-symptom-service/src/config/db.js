const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env");

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("AI Symptom Service MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;