const TelemedicineFile = require("../models/telemedicineFile");

exports.uploadSessionFile = async (req, res) => {
  try {
    const { appointmentId, uploadedByRole } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const newFile = await TelemedicineFile.create({
      appointmentId,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: `/uploads/${req.file.filename}`,
      uploadedByRole,
    });

    return res.status(201).json({
      success: true,
      data: newFile,
      message: "File uploaded successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to upload file",
      error: error.message,
    });
  }
};

exports.getFilesByAppointmentId = async (req, res) => {
  try {
    const files = await TelemedicineFile.find({
      appointmentId: req.params.appointmentId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: files,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch files",
      error: error.message,
    });
  }
};