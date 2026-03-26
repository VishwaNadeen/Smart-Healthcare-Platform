const TelemedicinePrescription = require("../models/telemedicinePrescription");

exports.createPrescription = async (req, res) => {
  try {
    const prescription = await TelemedicinePrescription.create(req.body);

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