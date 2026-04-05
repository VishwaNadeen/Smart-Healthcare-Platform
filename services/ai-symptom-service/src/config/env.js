require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5010,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI: process.env.MONGO_URI,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  INTERNAL_SERVICE_SECRET: process.env.INTERNAL_SERVICE_SECRET || "",
};