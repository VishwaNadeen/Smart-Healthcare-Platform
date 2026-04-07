const express = require("express");
const cors = require("cors");
const symptomRoutes = require("./routes/symptomRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "AI Symptom Service is running",
  });
});

app.use("/api/symptoms", symptomRoutes);

app.use(errorHandler);

module.exports = app;