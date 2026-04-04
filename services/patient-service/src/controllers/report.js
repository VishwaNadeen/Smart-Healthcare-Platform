const Report = require("../models/report");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const getCloudinaryResourceType = (mimetype = "") => {
  if (
    mimetype === "application/pdf" ||
    mimetype === "image/jpeg" ||
    mimetype === "image/jpg" ||
    mimetype === "image/png"
  ) {
    return "image";
  }

  return "raw";
};

const sanitizeFileName = (name = "") => {
  return name
    .replace(/\.[^/.]+$/, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "");
};

const uploadReportToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const resourceType = getCloudinaryResourceType(file.mimetype);
    const safeName = sanitizeFileName(file.originalname);

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "smart-healthcare/patient-reports",
        resource_type: resourceType,
        public_id: `${Date.now()}-${safeName}`,
        use_filename: false,
        unique_filename: false,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });

const deleteReportFromCloudinary = async (publicId, resourceType = "raw") => {
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
};

const uploadReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { reportType, reportTitle, providerName, reportDate, notes } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!reportTitle || !String(reportTitle).trim()) {
      return res.status(400).json({ message: "Report title is required" });
    }

    if (!reportDate) {
      return res.status(400).json({ message: "Report date is required" });
    }

    const uploadResult = await uploadReportToCloudinary(req.file);

    const report = await Report.create({
      patientId: id,
      fileName: req.file.originalname,
      filePath: uploadResult.secure_url,
      filePublicId: uploadResult.public_id,
      fileResourceType: uploadResult.resource_type || "raw",
      reportType: reportType || "general",
      reportTitle: String(reportTitle).trim(),
      providerName: typeof providerName === "string" ? providerName.trim() : "",
      reportDate,
      notes: typeof notes === "string" ? notes.trim() : "",
    });

    res.status(201).json({
      message: "Report uploaded successfully",
      report,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error uploading report",
      error: error.message,
    });
  }
};

const getPatientReports = async (req, res) => {
  try {
    const { id } = req.params;
    const reports = await Report.find({ patientId: id }).sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching reports",
      error: error.message,
    });
  }
};

const updatePatientReport = async (req, res) => {
  try {
    const { id, reportId } = req.params;
    const { reportType, reportTitle, providerName, reportDate, notes } = req.body;

    const report = await Report.findOne({ _id: reportId, patientId: id });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (!reportType || !String(reportType).trim()) {
      return res.status(400).json({ message: "Report type is required" });
    }

    if (!reportTitle || !String(reportTitle).trim()) {
      return res.status(400).json({ message: "Report title is required" });
    }

    if (!reportDate) {
      return res.status(400).json({ message: "Report date is required" });
    }

    let nextUploadResult = null;

    if (req.file) {
      nextUploadResult = await uploadReportToCloudinary(req.file);
    }

    report.reportType = String(reportType).trim();
    report.reportTitle = String(reportTitle).trim();
    report.providerName =
      typeof providerName === "string" ? providerName.trim() : "";
    report.reportDate = reportDate;
    report.notes = typeof notes === "string" ? notes.trim() : "";

    if (nextUploadResult) {
      const previousPublicId = report.filePublicId;
      const previousResourceType = report.fileResourceType || "raw";

      report.fileName = req.file.originalname;
      report.filePath = nextUploadResult.secure_url;
      report.filePublicId = nextUploadResult.public_id;
      report.fileResourceType = nextUploadResult.resource_type || "raw";

      await deleteReportFromCloudinary(previousPublicId, previousResourceType);
    }

    await report.save();

    return res.status(200).json({
      message: "Report updated successfully",
      report,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating report",
      error: error.message,
    });
  }
};

const deletePatientReport = async (req, res) => {
  try {
    const { id, reportId } = req.params;

    const report = await Report.findOne({ _id: reportId, patientId: id });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    await deleteReportFromCloudinary(
      report.filePublicId,
      report.fileResourceType || "raw"
    );

    await report.deleteOne();

    return res.status(200).json({
      message: "Report deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting report",
      error: error.message,
    });
  }
};

module.exports = {
  uploadReport,
  getPatientReports,
  updatePatientReport,
  deletePatientReport,
};
