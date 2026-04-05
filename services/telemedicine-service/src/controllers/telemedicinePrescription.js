const TelemedicinePrescription = require("../models/telemedicinePrescription");
const TelemedicineSession = require("../models/telemedicineSession");
const {
  buildEnrichedSession,
  getDoctorIdentityValues,
} = require("./telemedicine");

exports.createPrescription = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can create prescriptions",
      });
    }

    const { appointmentId, patientId, medicineName, dosage, instructions } = req.body;

    if (!appointmentId || !patientId || !medicineName || !dosage || !instructions) {
      return res.status(400).json({
        success: false,
        message: "appointmentId, patientId, medicineName, dosage and instructions are required",
      });
    }

    const doctorIds = getDoctorIdentityValues(req);

    if (!doctorIds.includes(String(req.session.doctorId))) {
      return res.status(403).json({
        success: false,
        message: "You can create prescriptions only for your own sessions",
      });
    }

    if (String(req.session.patientId) !== String(patientId)) {
      return res.status(400).json({
        success: false,
        message: "patientId does not match the session patient",
      });
    }

    const prescription = await TelemedicinePrescription.create({
      appointmentId,
      doctorId: String(req.session.doctorId),
      patientId,
      medicineName,
      dosage,
      instructions,
    });

    return res.status(201).json({
      success: true,
      data: prescription,
      message: "Prescription saved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save prescription",
      error: error.message,
    });
  }
};

exports.updatePrescription = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can update prescriptions",
      });
    }

    const { medicineName, dosage, instructions } = req.body || {};

    if (!medicineName || !dosage || !instructions) {
      return res.status(400).json({
        success: false,
        message: "medicineName, dosage and instructions are required",
      });
    }

    const prescription = await TelemedicinePrescription.findById(
      req.params.prescriptionId
    );

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    const session = await TelemedicineSession.findOne({
      appointmentId: String(prescription.appointmentId),
      doctorId: { $in: getDoctorIdentityValues(req) },
    });

    if (!session) {
      return res.status(403).json({
        success: false,
        message: "You can update prescriptions only for your own sessions",
      });
    }

    prescription.medicineName = String(medicineName).trim();
    prescription.dosage = String(dosage).trim();
    prescription.instructions = String(instructions).trim();

    await prescription.save();

    return res.status(200).json({
      success: true,
      data: prescription,
      message: "Prescription updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update prescription",
      error: error.message,
    });
  }
};

exports.getPrescriptionsByAppointmentId = async (req, res) => {
  try {
    const prescriptions = await TelemedicinePrescription.find({
      appointmentId: req.params.appointmentId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: prescriptions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch prescriptions",
      error: error.message,
    });
  }
};

exports.updateConsultationNotes = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can update consultation notes",
      });
    }

    const { notes } = req.body;

    const updatedSession = await TelemedicineSession.findOneAndUpdate(
      {
        appointmentId: req.params.appointmentId,
        doctorId: { $in: getDoctorIdentityValues(req) },
      },
      {
        notes: String(notes || ""),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedSession) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const enrichedSession = await buildEnrichedSession(updatedSession);

    return res.status(200).json({
      success: true,
      data: enrichedSession,
      message: "Consultation notes updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update consultation notes",
      error: error.message,
    });
  }
};
