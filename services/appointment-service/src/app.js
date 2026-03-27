const express = require("express");
const cors = require("cors");
const appointmentRoutes = require("./routes/appointmentRoutes");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// health check
app.get("/", (req, res) => {
  res.send("Appointment Service is running");
});

// appointment routes
app.use("/api/appointments", appointmentRoutes);

module.exports = app;