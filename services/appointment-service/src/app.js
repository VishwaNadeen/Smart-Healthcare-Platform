// services/appointment-service/src/app.js

const express = require("express");
const cors = require("cors");
const patientRoutes = require("./routes/appointmentRoutes");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("Patient Service is running");
});

// patient routes
app.use("/api/patients", patientRoutes);

module.exports = app;