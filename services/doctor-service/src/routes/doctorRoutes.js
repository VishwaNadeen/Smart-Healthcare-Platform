const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  createDoctor,
  getAllDoctors,
  getMyDoctorProfile,
  getDoctorById,
  updateMyDoctorProfile,
  deleteMyDoctorProfile,
  getMyAvailability,
  updateMyAvailability,
} = require("../controllers/doctorController");

/*
  Public doctor signup route
*/
router.post("/", createDoctor);

/*
  Protected current-user routes
  IMPORTANT: keep /me routes above /:id
*/
router.get("/me", authMiddleware.requireDoctorAuth, getMyDoctorProfile);
router.put("/me", authMiddleware.requireDoctorAuth, updateMyDoctorProfile);
router.delete("/me", authMiddleware.requireDoctorAuth, deleteMyDoctorProfile);

router.get("/me/availability", authMiddleware.requireDoctorAuth, getMyAvailability);
router.put("/me/availability", authMiddleware.requireDoctorAuth, updateMyAvailability);

/*
  Public/general routes
*/
router.get("/", getAllDoctors);
router.get("/:id", getDoctorById);

module.exports = router;