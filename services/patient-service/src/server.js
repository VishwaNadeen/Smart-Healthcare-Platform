const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const patientRoutes = require("./routes/patientRoutes");

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Patient Service Running");
});

// Patient routes
app.use("/api/patients", patientRoutes);

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
  console.log(`Patient Service running on port ${PORT}`);
});
