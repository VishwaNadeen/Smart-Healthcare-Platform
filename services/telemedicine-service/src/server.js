const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const telemedicineRoutes = require("./routes/telemedicineRoutes");
const telemedicineChatRoutes = require("./routes/telemedicineChatRoutes");
const path = require("path");
const telemedicineFileRoutes = require("./routes/telemedicineFileRoutes");
const telemedicinePrescriptionRoutes = require("./routes/telemedicinePrescriptionRoutes");

dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Telemedicine Service is running");
});

app.use("/api/telemedicine", telemedicineRoutes);
app.use("/api/telemedicine/chat", telemedicineChatRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/telemedicine/files", telemedicineFileRoutes);
app.use("/api/telemedicine/prescriptions", telemedicinePrescriptionRoutes);

const PORT = process.env.PORT || 5007;

app.listen(PORT, () => {
  console.log(`Telemedicine Service running on port ${PORT}`);
});
