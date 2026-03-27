const express = require("express");
<<<<<<< Updated upstream
const doctorRoutes = require("./routes/doctorRoutes");
const specialtyRoutes = require("./routes/specialtyRoutes");

const app = express();

app.use(express.json());

app.use("/api/doctors", doctorRoutes);
app.use("/api/specialties", specialtyRoutes);
=======
const cors = require("cors");
const doctorRoutes = require("./routes/doctorRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Doctor Service is running");
});

// Doctor routes
app.use("/api/doctors", doctorRoutes);
>>>>>>> Stashed changes

module.exports = app;