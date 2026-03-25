const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const patientRoutes = require("./routes/appointmentRoutes");

dotenv.config();

const app = express();

// connect database
connectDB();

// middleware
app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("Patient Service is running");
});

// patient routes
app.use("/api/patients", patientRoutes);

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`Patient Service running on port ${PORT}`);
});