const express = require("express");
const {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} = require("../controllers/doctorController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", createDoctor);
router.get("/", getAllDoctors);
router.get("/:id", getDoctorById);
router.put("/:id", requireAuth, updateDoctor);
router.delete("/:id", requireAuth, deleteDoctor);

module.exports = router;
