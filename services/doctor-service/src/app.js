const express = require("express");
const doctorRoutes = require("./routes/doctorRoutes");
const specialtyRoutes = require("./routes/specialtyRoutes");

const app = express();

app.use(express.json());

app.use("/api/doctors", doctorRoutes);
app.use("/api/specialties", specialtyRoutes);

module.exports = app;