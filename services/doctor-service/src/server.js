const dotenv = require("dotenv");
const connectDB = require("./config/db");
const app = require("./app");

dotenv.config();

// connect database
connectDB();

const PORT = process.env.PORT || 5003;

app.listen(PORT, () => {
  console.log(`Doctor Service running on port ${PORT}`);
});