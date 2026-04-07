const express = require("express");
const router = express.Router();

const {
  requirePatientAuth,
  requireDoctorAuth,
  requireAdminAuth,
  enforceDoctorParamOwnership,
} = require("../middleware/authMiddleware");

const {
  getSpecialtiesForDropdown,
  searchDoctorsBySpecialty,
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  getAppointmentsByDoctorId,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
  updateAppointmentStatus,
  getAppointmentTracking,
  getPatientAppointmentStatsAdmin,
  getInternalAppointmentById,
  updateAppointmentStatusInternal,
} = require("../controllers/appointmentController");

router.get("/specialties", getSpecialtiesForDropdown);
router.get("/doctors/search", searchDoctorsBySpecialty);

router.post("/", requirePatientAuth, createAppointment);
router.get("/", requirePatientAuth, getAllAppointments);
router.get("/doctor/:doctorId", requireDoctorAuth, enforceDoctorParamOwnership, getAppointmentsByDoctorId);
router.get("/admin/patient/:patientId/stats", requireAdminAuth, getPatientAppointmentStatsAdmin);
router.get("/:id/tracking", requirePatientAuth, getAppointmentTracking);
router.get("/:id", requirePatientAuth, getAppointmentById);
router.put("/:id", requirePatientAuth, updateAppointment);
router.patch("/:id/cancel", requirePatientAuth, cancelAppointment);
router.delete("/:id", requirePatientAuth, deleteAppointment);
router.patch("/:id/status", requireDoctorAuth, updateAppointmentStatus);

/*
  Internal service-to-service routes
  Protected with x-internal-service-secret
*/
router.get("/internal/:id", getInternalAppointmentById);
router.patch("/internal/:id/status", updateAppointmentStatusInternal);

module.exports = router;
