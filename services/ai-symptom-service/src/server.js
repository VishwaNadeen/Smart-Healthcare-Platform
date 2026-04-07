const app = require("./app");
const { PORT } = require("./config/env");
const connectDB = require("./config/db");

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`AI Symptom Service running on port ${PORT}`);
  });
}

startServer();