const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const validate = require("../middlewares/validate");

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

const {
  createPatientSchema,
  updateCurrentPatientSchema,
  deleteCurrentPatientSchema,
} = require("../validations/patientValidation");

router.post("/", validate(createPatientSchema), createPatient);
router.get("/", getAllPatients);
router.get("/me", authMiddleware, getCurrentPatient);
router.put(
  "/me",
  authMiddleware,
  validate(updateCurrentPatientSchema),
  updateCurrentPatient
);
router.post(
  "/me/profile-image",
  authMiddleware,
  upload.single("profileImage"),
  uploadCurrentPatientProfileImage
);
router.delete(
  "/me/profile-image",
  authMiddleware,
  removeCurrentPatientProfileImage
);
router.delete(
  "/me",
  authMiddleware,
  validate(deleteCurrentPatientSchema),
  deleteCurrentPatient
);
router.get("/:id", getPatientById);

module.exports = router;