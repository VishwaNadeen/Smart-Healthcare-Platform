const express = require("express");
const router = express.Router();
const upload = require("../middlewares/report");
const {
  uploadReport,
  getPatientReports,
  updatePatientReport,
  deletePatientReport,
} = require("../controllers/report");

router.post("/patients/:id/reports", (req, res, next) => {
  upload.single("report")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message || "Failed to upload report",
      });
    }

    next();
  });
}, uploadReport);

router.get("/patients/:id/reports", getPatientReports);
router.patch("/patients/:id/reports/:reportId", (req, res, next) => {
  upload.single("report")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message || "Failed to update report",
      });
    }

    next();
  });
}, updatePatientReport);
router.delete("/patients/:id/reports/:reportId", deletePatientReport);

module.exports = router;
