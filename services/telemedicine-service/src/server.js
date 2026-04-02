const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const telemedicineRoutes = require("./routes/telemedicine");
const telemedicineChatRoutes = require("./routes/telemedicineChat");
const telemedicinePrescriptionRoutes = require("./routes/telemedicinePrescription");

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
app.use("/api/telemedicine/prescriptions", telemedicinePrescriptionRoutes);

const PORT = process.env.PORT || 5007;

app.listen(PORT, () => {
  console.log(`Telemedicine Service running on port ${PORT}`);
});
