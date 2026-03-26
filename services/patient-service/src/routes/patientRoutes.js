const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  createPatient,
  getAllPatients,
  getCurrentPatient,
  getPatientById,
  updateCurrentPatient,
  deleteCurrentPatient,
} = require("../controllers/patientController");

router.post("/", createPatient);
router.get("/", getAllPatients);
router.get("/me", authMiddleware, getCurrentPatient);
router.put("/me", authMiddleware, updateCurrentPatient);
router.delete("/me", authMiddleware, deleteCurrentPatient);
router.get("/:id", getPatientById);

module.exports = router;
