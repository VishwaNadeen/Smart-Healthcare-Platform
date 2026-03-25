const express = require("express");
const router = express.Router();

const {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  getAppointmentsByPatientId,
  getAppointmentsByDoctorId,
  updateAppointment,
  cancelAppointment,
  updateAppointmentStatus,
} = require("../controllers/appointmentController");

router.post("/", createAppointment);
router.get("/", getAllAppointments);
router.get("/:id", getAppointmentById);
router.get("/patient/:patientId", getAppointmentsByPatientId);
router.get("/doctor/:doctorId", getAppointmentsByDoctorId);
router.put("/:id", updateAppointment);
router.patch("/:id/cancel", cancelAppointment);
router.patch("/:id/status", updateAppointmentStatus);

module.exports = router;