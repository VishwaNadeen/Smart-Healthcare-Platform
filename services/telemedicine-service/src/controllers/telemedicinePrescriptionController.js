const TelemedicinePrescription = require("../models/telemedicinePrescription");

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

    if (String(req.session.doctorId) !== String(req.user.userId)) {
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
      doctorId: String(req.user.userId),
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
