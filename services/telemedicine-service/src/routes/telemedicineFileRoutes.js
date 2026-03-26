const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const {
  uploadSessionFile,
  getFilesByAppointmentId,
} = require("../controllers/telemedicineFileController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "src/uploads");
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.get("/:appointmentId", getFilesByAppointmentId);
router.post("/", upload.single("file"), uploadSessionFile);

module.exports = router;