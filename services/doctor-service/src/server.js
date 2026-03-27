const dotenv = require("dotenv");
const connectDB = require("./config/db");
const app = require("./app");

dotenv.config();

const PORT = process.env.PORT || 5003;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Doctor Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Doctor Service failed to start:", error.message);
    process.exit(1);
  }
};

startServer();