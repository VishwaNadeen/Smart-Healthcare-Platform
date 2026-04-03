process.env.DOTENV_CONFIG_QUIET = "true";
require("dotenv").config();

const connectDB = require("./config/db");
const app = require("./app");

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