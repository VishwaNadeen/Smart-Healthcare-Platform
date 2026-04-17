const express = require("express");
const {
  analyzeSymptoms,
  getQuestions,
  getSymptomHistory,
  getSymptomCheckById,
  chatAboutSymptomCheck,
  getLatestSymptomCheck,
  closeSymptomCheck,
  reopenSymptomCheck,
  startSymptomConversation,
} = require("../controllers/symptomController");
const requireAuth = require("../middlewares/requireAuth");
const requirePatientRole = require("../middlewares/requirePatientRole");
const validateSymptomAnalysis = require("../middlewares/validateSymptomAnalysis");
const validateSymptomChat = require("../middlewares/validateSymptomChat");

const router = express.Router();

router.get("/questions", requireAuth, requirePatientRole, getQuestions);

router.get("/latest/me", requireAuth, requirePatientRole, getLatestSymptomCheck);

router.post(
  "/start",
  requireAuth,
  requirePatientRole,
  validateSymptomChat,
  startSymptomConversation
);

router.post(
  "/analyze",
  requireAuth,
  requirePatientRole,
  validateSymptomAnalysis,
  analyzeSymptoms
);

router.get(
  "/history/:patientId",
  requireAuth,
  requirePatientRole,
  getSymptomHistory
);

router.post(
  "/chat/:id",
  requireAuth,
  requirePatientRole,
  validateSymptomChat,
  chatAboutSymptomCheck
);

router.patch("/:id/close", requireAuth, requirePatientRole, closeSymptomCheck);

router.patch("/:id/reopen", requireAuth, requirePatientRole, reopenSymptomCheck);

router.get("/:id", requireAuth, requirePatientRole, getSymptomCheckById);

module.exports = router;