const express = require("express");
const path = require("path");
const reportRoutes = require("./src/routes/report.routes");

const app = express();

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api", reportRoutes);

module.exports = app;