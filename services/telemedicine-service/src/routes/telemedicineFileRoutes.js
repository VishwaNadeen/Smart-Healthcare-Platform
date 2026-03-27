const express = require("express");
const multer = require("multer");

const router = express.Router();
const {
  uploadSessionFile,
  getFilesByAppointmentId,
} = require("../controllers/telemedicineFileController");
const authMiddleware = require("../middleware/authMiddleware");
const sessionAccessMiddleware = require("../middleware/sessionAccessMiddleware");

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, "src/uploads");
  },
  filename: function (_req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.get("/:appointmentId", authMiddleware, sessionAccessMiddleware, getFilesByAppointmentId);
router.post("/", authMiddleware, upload.single("file"), sessionAccessMiddleware, uploadSessionFile);

module.exports = router;
