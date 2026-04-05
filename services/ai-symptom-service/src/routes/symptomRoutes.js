const express = require("express");
const {
  analyzeSymptoms,
  getQuestions,
  getSymptomHistory,
  getSymptomCheckById,
  chatAboutSymptomCheck,
} = require("../controllers/symptomController");

const router = express.Router();

router.get("/questions", getQuestions);
router.post("/analyze", analyzeSymptoms);
router.get("/history/:patientId", getSymptomHistory);
router.get("/:id", getSymptomCheckById);
router.post("/chat/:id", chatAboutSymptomCheck);

module.exports = router;