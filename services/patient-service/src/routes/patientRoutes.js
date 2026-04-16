const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const validate = require("../middlewares/validate");

const {
  createPatient,
  getAllPatients,
  getAllPatientsAdmin,
  getCurrentPatient,
  getPatientById,
  getPatientByIdAdmin,
  getPatientSummaryByAuthUserId,
  updateCurrentPatient,
  updatePatientAdmin,
  updatePatientStatusAdmin,
  uploadCurrentPatientProfileImage,
  removeCurrentPatientProfileImage,
  deleteCurrentPatient,
  deletePatientAdmin,
  getPatientByAuthUserIdInternal,
} = require("../controllers/patientController");

const {
  createPatientSchema,
  updateCurrentPatientSchema,
  deleteCurrentPatientSchema,
} = require("../validations/patientValidation");



// ADDED: internal route — used by notification service to fetch patient contact details
router.get("/internal/lookup/auth/:authUserId", getPatientByAuthUserIdInternal);
/*
  Public signup route
*/
router.post("/", validate(createPatientSchema), createPatient);

/*
  Public/general routes
*/
router.get("/", getAllPatients);
router.get("/admin", authMiddleware, getAllPatientsAdmin);
router.get("/admin/:id", authMiddleware, getPatientByIdAdmin);
router.put("/admin/:id", authMiddleware, updatePatientAdmin);
router.patch("/admin/:id/status", authMiddleware, updatePatientStatusAdmin);
router.delete("/admin/:id", authMiddleware, deletePatientAdmin);

/*
  Protected current-user routes
  IMPORTANT: keep /me routes above /:id
*/
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

router.get("/lookup/auth/:authUserId", authMiddleware, getPatientSummaryByAuthUserId);

router.get("/:id", getPatientById);

module.exports = router;
