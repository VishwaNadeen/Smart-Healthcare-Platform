const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const appointmentRoutes = require("./routes/appointmentRoutes");

dotenv.config();

const app = express();

// connect database
connectDB();

// middleware
app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("Appointment Service is running");
});

// appointment routes
app.use("/api/appointments", appointmentRoutes);

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`Appointment Service running on port ${PORT}`);
});