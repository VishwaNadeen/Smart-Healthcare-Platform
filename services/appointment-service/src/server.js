// services/appointment-service/src/server.js

const dotenv = require("dotenv");
const connectDB = require("./config/db");
const app = require("./app");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Patient Service running on port ${PORT}`);
});