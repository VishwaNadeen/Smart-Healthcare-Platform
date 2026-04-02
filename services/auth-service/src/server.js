process.env.DOTENV_CONFIG_QUIET = "true";
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const { ensureAdminUser } = require("./services/authService");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Auth service is running");
});

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5002;

const startServer = async () => {
  await connectDB();
  await ensureAdminUser();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start auth service:", error.message);
  process.exit(1);
});
