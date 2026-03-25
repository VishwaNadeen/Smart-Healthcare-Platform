const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const telemedicineRoutes = require("./routes/telemedicineRoutes");

dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Telemedicine Service is running");
});

app.use("/api/telemedicine", telemedicineRoutes);

const PORT = process.env.PORT || 5007;

app.listen(PORT, () => {
  console.log(`Telemedicine Service running on port ${PORT}`);
});