const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const patientRoutes = require("./routes/patientRoutes");
const reportRoutes = require("./routes/report");

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Test route
app.get("/", (req, res) => {
  res.send("Patient Service Running");
});

// Patient routes
app.use("/api/patients", patientRoutes);
app.use("/api", reportRoutes);

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
  console.log(`Patient Service running on port ${PORT}`);
});
