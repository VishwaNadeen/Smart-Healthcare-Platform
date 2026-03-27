const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const {
  createPatient,
  getAllPatients,
  getCurrentPatient,
  getPatientById,
  updateCurrentPatient,
  uploadCurrentPatientProfileImage,
  deleteCurrentPatient,
} = require("../controllers/patientController");

router.post("/", createPatient);
router.get("/", getAllPatients);
router.get("/me", authMiddleware, getCurrentPatient);
router.put("/me", authMiddleware, updateCurrentPatient);
router.post(
  "/me/profile-image",
  authMiddleware,
  upload.single("profileImage"),
  uploadCurrentPatientProfileImage
);
router.delete("/me", authMiddleware, deleteCurrentPatient);
router.get("/:id", getPatientById);

module.exports = router;