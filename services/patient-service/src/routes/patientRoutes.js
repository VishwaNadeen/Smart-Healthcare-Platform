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
  removeCurrentPatientProfileImage,
  deleteCurrentPatient,
} = require("../controllers/patientController");

/*
  Public signup route
*/
router.post("/", createPatient);

/*
  Protected current-user routes
  IMPORTANT: keep /me routes above /:id
*/
router.get("/me", authMiddleware, getCurrentPatient);
router.put("/me", authMiddleware, updateCurrentPatient);
router.post(
  "/me/profile-image",
  authMiddleware,
  upload.single("profileImage"),
  uploadCurrentPatientProfileImage
);
router.delete("/me/profile-image", authMiddleware, removeCurrentPatientProfileImage);
router.delete("/me", authMiddleware, deleteCurrentPatient);

/*
  Public/general routes
*/
router.get("/", getAllPatients);
router.get("/:id", getPatientById);

module.exports = router;