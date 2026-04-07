const symptomQuestions = require("../utils/symptomQuestions");
const { evaluateSymptoms } = require("../services/ruleEngine");
const {
  generatePatientFriendlyExplanation,
  chatWithPatient,
} = require("../services/geminiService");
const { buildRecommendation } = require("../services/recommendationService");
const SymptomCheck = require("../models/SymptomCheck");

function getAuthenticatedPatientId(req) {
  return (
    req.user?.patientProfileId ||
    req.user?.patientId ||
    req.user?.userId ||
    req.user?.id ||
    ""
  );
}

async function getQuestions(req, res, next) {
  try {
    return res.json({
      success: true,
      data: symptomQuestions,
    });
  } catch (error) {
    next(error);
  }
}

async function analyzeSymptoms(req, res, next) {
  try {
    const authenticatedPatientId = String(getAuthenticatedPatientId(req)).trim();
    const symptoms = req.body;

    if (!authenticatedPatientId) {
      return res.status(401).json({
        success: false,
        message: "Logged-in patient ID was not found from token.",
      });
    }

    const ruleResult = evaluateSymptoms(symptoms);
    const recommendation = buildRecommendation(ruleResult);

    let aiResponse = "";

    try {
      aiResponse = await generatePatientFriendlyExplanation({
        symptoms,
        analysis: ruleResult,
        recommendation,
      });
    } catch (geminiError) {
      console.error("Gemini generation failed:", geminiError.message);
      aiResponse =
        "We analyzed your symptoms successfully, but the AI explanation is currently unavailable. Please consult a doctor if symptoms continue or worsen.";
    }

    const savedCheck = await SymptomCheck.create({
      patientId: authenticatedPatientId,
      symptoms,
      analysis: ruleResult,
      recommendation,
      aiExplanation: aiResponse,
      status: "completed",
    });

    return res.status(201).json({
      success: true,
      message: "Symptom analysis completed and saved successfully.",
      data: savedCheck,
    });
  } catch (error) {
    next(error);
  }
}

async function getSymptomHistory(req, res, next) {
  try {
    const authenticatedPatientId = String(getAuthenticatedPatientId(req)).trim();
    const requestedPatientId = String(req.params.patientId || "").trim();

    if (!authenticatedPatientId) {
      return res.status(401).json({
        success: false,
        message: "Logged-in patient ID was not found from token.",
      });
    }

    if (requestedPatientId !== authenticatedPatientId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view another patient's symptom history.",
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const [history, totalCount] = await Promise.all([
      SymptomCheck.find({ patientId: authenticatedPatientId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SymptomCheck.countDocuments({ patientId: authenticatedPatientId }),
    ]);

    return res.json({
      success: true,
      count: history.length,
      totalCount,
      page,
      limit,
      hasMore: skip + history.length < totalCount,
      data: history,
    });
  } catch (error) {
    next(error);
  }
}

async function getSymptomCheckById(req, res, next) {
  try {
    const authenticatedPatientId = String(getAuthenticatedPatientId(req)).trim();
    const { id } = req.params;

    const symptomCheck = await SymptomCheck.findById(id);

    if (!symptomCheck) {
      return res.status(404).json({
        success: false,
        message: "Symptom check record not found.",
      });
    }

    if (String(symptomCheck.patientId) !== authenticatedPatientId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this symptom check.",
      });
    }

    return res.json({
      success: true,
      data: symptomCheck,
    });
  } catch (error) {
    next(error);
  }
}

async function chatAboutSymptomCheck(req, res, next) {
  try {
    const authenticatedPatientId = String(getAuthenticatedPatientId(req)).trim();
    const { id } = req.params;
    const { message } = req.body;

    const symptomCheck = await SymptomCheck.findById(id);

    if (!symptomCheck) {
      return res.status(404).json({
        success: false,
        message: "Symptom check record not found.",
      });
    }

    if (String(symptomCheck.patientId) !== authenticatedPatientId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to chat on this symptom check.",
      });
    }

    if (symptomCheck.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "This symptom check is already closed. Chat is no longer allowed.",
      });
    }

    const userMessage = {
      role: "user",
      message: message.trim(),
      timestamp: new Date(),
    };

    symptomCheck.chatHistory.push(userMessage);

    let assistantReply = "";

    try {
      assistantReply = await chatWithPatient({
        symptomCheck,
        message: message.trim(),
      });
    } catch (geminiError) {
      console.error("Gemini chat failed:", geminiError.message);
      assistantReply =
        "Sorry, the AI chat is currently unavailable. Please consult a doctor if you need urgent medical advice.";
    }

    const assistantMessage = {
      role: "assistant",
      message: assistantReply,
      timestamp: new Date(),
    };

    symptomCheck.chatHistory.push(assistantMessage);

    if (symptomCheck.status === "completed") {
      symptomCheck.status = "follow_up_pending";
    }

    await symptomCheck.save();

    return res.status(200).json({
      success: true,
      message: "Chat saved successfully.",
      data: {
        symptomCheckId: symptomCheck._id,
        userMessage,
        assistantMessage,
        chatHistory: symptomCheck.chatHistory,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getLatestSymptomCheck(req, res, next) {
  try {
    const authenticatedPatientId = String(getAuthenticatedPatientId(req)).trim();

    if (!authenticatedPatientId) {
      return res.status(401).json({
        success: false,
        message: "Logged-in patient ID was not found from token.",
      });
    }

    const latestRecord = await SymptomCheck.findOne({
      patientId: authenticatedPatientId,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: latestRecord,
    });
  } catch (error) {
    next(error);
  }
}

async function closeSymptomCheck(req, res, next) {
  try {
    const authenticatedPatientId = String(getAuthenticatedPatientId(req)).trim();
    const { id } = req.params;

    const symptomCheck = await SymptomCheck.findById(id);

    if (!symptomCheck) {
      return res.status(404).json({
        success: false,
        message: "Symptom check record not found.",
      });
    }

    if (String(symptomCheck.patientId) !== authenticatedPatientId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to close this symptom check.",
      });
    }

    symptomCheck.status = "closed";
    await symptomCheck.save();

    return res.json({
      success: true,
      message: "Symptom check marked as closed successfully.",
      data: symptomCheck,
    });
  } catch (error) {
    next(error);
  }
}

async function reopenSymptomCheck(req, res, next) {
  try {
    const authenticatedPatientId = String(getAuthenticatedPatientId(req)).trim();
    const { id } = req.params;

    const symptomCheck = await SymptomCheck.findById(id);

    if (!symptomCheck) {
      return res.status(404).json({
        success: false,
        message: "Symptom check record not found.",
      });
    }

    if (String(symptomCheck.patientId) !== authenticatedPatientId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to reopen this symptom check.",
      });
    }

    if (symptomCheck.status !== "closed") {
      return res.status(400).json({
        success: false,
        message: "Only closed symptom checks can be reopened.",
      });
    }

    symptomCheck.status = "follow_up_pending";
    await symptomCheck.save();

    return res.json({
      success: true,
      message: "Symptom check reopened successfully.",
      data: symptomCheck,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getQuestions,
  analyzeSymptoms,
  getSymptomHistory,
  getSymptomCheckById,
  chatAboutSymptomCheck,
  getLatestSymptomCheck,
  closeSymptomCheck,
  reopenSymptomCheck,
};