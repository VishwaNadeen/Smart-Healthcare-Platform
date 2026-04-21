const express = require("express");
const cors = require("cors");
const path = require("path");

const patientRoutes = require("./routes/patientRoutes");
const reportRoutes = require("./routes/report");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req, res) => {
  res.send("Patient Service Running");
});

app.use("/api/patients", patientRoutes);
app.use("/api", reportRoutes);

module.exports = app;