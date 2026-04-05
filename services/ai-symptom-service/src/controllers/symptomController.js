const symptomQuestions = require("../utils/symptomQuestions");
const { evaluateSymptoms } = require("../services/ruleEngine");
const {
  generatePatientFriendlyExplanation,
  chatWithPatient,
} = require("../services/geminiService");
const { buildRecommendation } = require("../services/recommendationService");
const SymptomCheck = require("../models/SymptomCheck");

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
    const { patientId, ...symptoms } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "patientId is required.",
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
      patientId,
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
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "patientId is required.",
      });
    }

    const history = await SymptomCheck.find({ patientId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
}

async function getSymptomCheckById(req, res, next) {
  try {
    const { id } = req.params;

    const symptomCheck = await SymptomCheck.findById(id);

    if (!symptomCheck) {
      return res.status(404).json({
        success: false,
        message: "Symptom check record not found.",
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
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Chat message is required.",
      });
    }

    const symptomCheck = await SymptomCheck.findById(id);

    if (!symptomCheck) {
      return res.status(404).json({
        success: false,
        message: "Symptom check record not found.",
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

module.exports = {
  getQuestions,
  analyzeSymptoms,
  getSymptomHistory,
  getSymptomCheckById,
  chatAboutSymptomCheck,
};