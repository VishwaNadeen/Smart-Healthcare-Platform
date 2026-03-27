const dotenv = require("dotenv");
const connectDB = require("./config/db");
<<<<<<< Updated upstream
const appointmentRoutes = require("./routes/appointmentRoutes");

dotenv.config();

const app = express();

// connect database
connectDB();

// middleware
app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("Appointment Service is running");
});

// appointment routes
app.use("/api/appointments", appointmentRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Appointment Service running on port ${PORT}`);
});
=======
const app = require("./app");

dotenv.config();

const PORT = process.env.PORT || 5002;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Appointment Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Appointment Service failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
>>>>>>> Stashed changes
