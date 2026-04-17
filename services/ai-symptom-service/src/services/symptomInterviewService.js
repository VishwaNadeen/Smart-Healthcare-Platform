const { symptomFields } = require("../config/symptomFields");
const { normalizeSymptoms, evaluateSymptoms } = require("./ruleEngine");
const { buildRecommendation } = require("./recommendationService");
const { generatePatientFriendlyExplanation } = require("./geminiService");

function getQuestionById(id) {
  return symptomFields.find((field) => field.id === id) || null;
}

function getQuestionIdsByGroup() {
  return {
    respiratory: ["fever", "cough", "soreThroat"],
    emergency: ["chestPain", "shortnessOfBreath"],
    neuro: ["headache", "blurredVision"],
    gastro: ["vomiting"],
    duration: ["durationDays"],
  };
}

function getMissingQuestionIds(symptoms = {}) {
  return symptomFields
    .filter((field) => !(field.id in symptoms))
    .map((field) => field.id);
}

function getNextMissingQuestionId(symptoms = {}) {
  const missingIds = getMissingQuestionIds(symptoms);
  return missingIds[0] || "";
}

function isConversationComplete(symptoms = {}) {
  return getMissingQuestionIds(symptoms).length === 0;
}

function buildQuestionPrompt(field) {
  if (!field) {
    return "";
  }

  if (field.type === "boolean") {
    return `${field.question} Please answer yes or no.`;
  }

  if (field.type === "number") {
    return `${field.question} Please reply with a number only.`;
  }

  return field.question;
}

function buildWelcomePrompt() {
  return "Hello — please tell me what symptoms you have, how long they have been happening, and whether anything feels severe. For example: I have fever and cough for 2 days.";
}

function isGreetingOnly(message = "") {
  const value = String(message).trim().toLowerCase();

  const greetingValues = [
    "hi",
    "hello",
    "hey",
    "hii",
    "helo",
    "help",
    "start",
    "ok",
    "okay",
  ];

  return greetingValues.includes(value);
}

function parseBooleanAnswer(message = "") {
  const value = String(message).trim().toLowerCase();

  if (
    [
      "yes",
      "y",
      "yeah",
      "yep",
      "true",
      "i do",
      "have",
      "having",
      "a little",
      "slight",
      "slightly",
    ].includes(value)
  ) {
    return true;
  }

  if (
    [
      "no",
      "n",
      "nope",
      "false",
      "i don't",
      "dont",
      "do not",
      "none",
      "not at all",
    ].includes(value)
  ) {
    return false;
  }

  return null;
}

function parseNumberAnswer(message = "") {
  const matched = String(message).match(/\d+/);

  if (!matched) {
    return null;
  }

  const parsed = Number(matched[0]);

  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function extractDurationDays(message = "") {
  const normalizedMessage = String(message).toLowerCase();

  const digitMatch = normalizedMessage.match(/(\d+)\s*(day|days)/);
  if (digitMatch) {
    return Number(digitMatch[1]);
  }

  const weekDigitMatch = normalizedMessage.match(/(\d+)\s*(week|weeks)/);
  if (weekDigitMatch) {
    return Number(weekDigitMatch[1]) * 7;
  }

  if (normalizedMessage.includes("today")) return 0;
  if (normalizedMessage.includes("yesterday")) return 1;
  if (normalizedMessage.includes("two days")) return 2;
  if (normalizedMessage.includes("three days")) return 3;
  if (normalizedMessage.includes("four days")) return 4;
  if (normalizedMessage.includes("five days")) return 5;
  if (normalizedMessage.includes("one week")) return 7;
  if (normalizedMessage.includes("two weeks")) return 14;

  return null;
}

function hasNegationBeforeKeyword(text, keyword) {
  const patterns = [
    `no ${keyword}`,
    `not ${keyword}`,
    `without ${keyword}`,
    `don't have ${keyword}`,
    `do not have ${keyword}`,
  ];

  return patterns.some((pattern) => text.includes(pattern));
}

function detectBooleanSymptom(message, keywords = []) {
  const text = String(message).toLowerCase();

  for (const keyword of keywords) {
    if (hasNegationBeforeKeyword(text, keyword)) {
      return false;
    }

    if (text.includes(keyword)) {
      return true;
    }
  }

  return undefined;
}

function extractSymptomsFromInitialMessage(message = "") {
  const text = String(message).trim().toLowerCase();
  const extracted = {};

  if (!text) {
    return extracted;
  }

  const symptomMatchers = {
    fever: ["fever", "high temperature", "temperature"],
    cough: ["cough", "coughing"],
    soreThroat: ["sore throat", "throat pain", "painful throat"],
    chestPain: ["chest pain", "pain in chest", "tight chest", "chest tightness"],
    shortnessOfBreath: [
      "shortness of breath",
      "breathing problem",
      "breathless",
      "difficulty breathing",
      "hard to breathe",
    ],
    headache: ["headache", "head pain", "migraine"],
    blurredVision: ["blurred vision", "blurry vision", "cannot see clearly"],
    vomiting: ["vomiting", "vomit", "threw up", "throwing up"],
  };

  Object.entries(symptomMatchers).forEach(([fieldId, keywords]) => {
    const detected = detectBooleanSymptom(text, keywords);
    if (typeof detected === "boolean") {
      extracted[fieldId] = detected;
    }
  });

  const durationDays = extractDurationDays(text);
  if (typeof durationDays === "number") {
    extracted.durationDays = durationDays;
  }

  return extracted;
}

function parseGroupedBooleanAnswer(message = "", fieldIds = []) {
  const text = String(message).trim().toLowerCase();
  const parsed = {};

  if (!text || fieldIds.length === 0) {
    return parsed;
  }

  const yesAll = [
    "yes",
    "yes all",
    "all yes",
    "all of them",
    "i have all",
    "all",
  ];

  const noAll = [
    "no",
    "none",
    "none of them",
    "no all",
    "all no",
    "no to all",
  ];

  if (yesAll.includes(text)) {
    fieldIds.forEach((id) => {
      parsed[id] = true;
    });
    return parsed;
  }

  if (noAll.includes(text)) {
    fieldIds.forEach((id) => {
      parsed[id] = false;
    });
    return parsed;
  }

  const symptomMatchers = {
    fever: ["fever", "temperature", "high temperature"],
    cough: ["cough", "coughing"],
    soreThroat: ["sore throat", "throat pain", "painful throat"],
    chestPain: ["chest pain", "pain in chest", "tight chest", "chest tightness"],
    shortnessOfBreath: [
      "shortness of breath",
      "breathing problem",
      "breathless",
      "difficulty breathing",
      "hard to breathe",
    ],
    headache: ["headache", "head pain", "migraine"],
    blurredVision: ["blurred vision", "blurry vision", "cannot see clearly"],
    vomiting: ["vomiting", "vomit", "threw up", "throwing up"],
  };

  fieldIds.forEach((fieldId) => {
    const keywords = symptomMatchers[fieldId] || [];
    const detected = detectBooleanSymptom(text, keywords);

    if (typeof detected === "boolean") {
      parsed[fieldId] = detected;
    }
  });

  return parsed;
}

function getGroupForQuestionId(questionId = "") {
  const groups = getQuestionIdsByGroup();

  for (const [groupName, ids] of Object.entries(groups)) {
    if (ids.includes(questionId)) {
      return groupName;
    }
  }

  return "";
}

function getNextQuestionPlan(symptoms = {}) {
  const groups = getQuestionIdsByGroup();

  const emergencyMissing = groups.emergency.filter((id) => !(id in symptoms));
  if (emergencyMissing.length > 0) {
    return {
      type: emergencyMissing.length > 1 ? "group_boolean" : "single",
      group: "emergency",
      questionIds: emergencyMissing,
    };
  }

  const respiratoryMissing = groups.respiratory.filter((id) => !(id in symptoms));
  if (respiratoryMissing.length > 0) {
    return {
      type: respiratoryMissing.length > 1 ? "group_boolean" : "single",
      group: "respiratory",
      questionIds: respiratoryMissing,
    };
  }

  const neuroMissing = groups.neuro.filter((id) => !(id in symptoms));
  if (neuroMissing.length > 0) {
    return {
      type: neuroMissing.length > 1 ? "group_boolean" : "single",
      group: "neuro",
      questionIds: neuroMissing,
    };
  }

  const gastroMissing = groups.gastro.filter((id) => !(id in symptoms));
  if (gastroMissing.length > 0) {
    return {
      type: gastroMissing.length > 1 ? "group_boolean" : "single",
      group: "gastro",
      questionIds: gastroMissing,
    };
  }

  const durationMissing = groups.duration.filter((id) => !(id in symptoms));
  if (durationMissing.length > 0) {
    return {
      type: "single",
      group: "duration",
      questionIds: durationMissing,
    };
  }

  return {
    type: "complete",
    group: "",
    questionIds: [],
  };
}

function buildGroupQuestionPrompt(questionIds = []) {
  const ids = Array.isArray(questionIds) ? questionIds : [];

  const labels = ids
    .map((id) => getQuestionById(id))
    .filter(Boolean)
    .map((field) => {
      switch (field.id) {
        case "soreThroat":
          return "sore throat";
        case "chestPain":
          return "chest pain";
        case "shortnessOfBreath":
          return "shortness of breath";
        case "blurredVision":
          return "blurred vision";
        default:
          return field.id.replace(/([A-Z])/g, " $1").toLowerCase();
      }
    });

  if (labels.length === 0) {
    return "";
  }

  if (labels.length === 1) {
    return buildQuestionPrompt(getQuestionById(ids[0]));
  }

  if (labels.length === 2) {
    return `Thanks. Do you also have ${labels[0]} or ${labels[1]}? You can answer in one message.`;
  }

  const lastLabel = labels[labels.length - 1];
  const firstLabels = labels.slice(0, -1).join(", ");

  return `Thanks. Do you also have ${firstLabels}, or ${lastLabel}? You can answer in one message.`;
}

function parseAnswerForQuestion(questionId, message) {
  const question = getQuestionById(questionId);

  if (!question) {
    return {
      valid: false,
      value: null,
      errorMessage: "I could not match the current question. Please try again.",
    };
  }

  if (question.type === "boolean") {
    const booleanValue = parseBooleanAnswer(message);

    if (typeof booleanValue !== "boolean") {
      return {
        valid: false,
        value: null,
        errorMessage: `${question.question} Please answer only yes or no.`,
      };
    }

    return {
      valid: true,
      value: booleanValue,
      errorMessage: "",
    };
  }

  if (question.type === "number") {
    const numberValue = parseNumberAnswer(message);

    if (typeof numberValue !== "number") {
      return {
        valid: false,
        value: null,
        errorMessage: `${question.question} Please reply with a valid number.`,
      };
    }

    return {
      valid: true,
      value: numberValue,
      errorMessage: "",
    };
  }

  return {
    valid: false,
    value: null,
    errorMessage: "Invalid question type.",
  };
}

function mergeExtractedSymptoms(currentSymptoms = {}, newSymptoms = {}) {
  return {
    ...currentSymptoms,
    ...newSymptoms,
  };
}

async function finalizeSymptomCheck(symptomCheck) {
  const normalizedSymptoms = normalizeSymptoms(symptomCheck.symptoms || {});
  const ruleResult = evaluateSymptoms(normalizedSymptoms);
  const recommendation = buildRecommendation(ruleResult);

  let aiResponse = "";

  try {
    aiResponse = await generatePatientFriendlyExplanation({
      symptoms: normalizedSymptoms,
      analysis: ruleResult,
      recommendation,
    });
  } catch (error) {
    console.error("Gemini generation failed:", error.message);
    aiResponse =
      "We analyzed your symptoms successfully, but the AI explanation is currently unavailable. Please consult a doctor if symptoms continue or worsen.";
  }

  symptomCheck.symptoms = normalizedSymptoms;
  symptomCheck.analysis = ruleResult;
  symptomCheck.recommendation = recommendation;
  symptomCheck.aiExplanation = aiResponse;
  symptomCheck.conversationStage = "completed";
  symptomCheck.currentQuestionId = "";
  symptomCheck.status = "completed";

  return {
    normalizedSymptoms,
    ruleResult,
    recommendation,
    aiResponse,
  };
}

module.exports = {
  getQuestionById,
  getQuestionIdsByGroup,
  getMissingQuestionIds,
  getNextMissingQuestionId,
  getNextQuestionPlan,
  isConversationComplete,
  buildQuestionPrompt,
  buildGroupQuestionPrompt,
  buildWelcomePrompt,
  isGreetingOnly,
  extractSymptomsFromInitialMessage,
  parseGroupedBooleanAnswer,
  parseAnswerForQuestion,
  getGroupForQuestionId,
  mergeExtractedSymptoms,
  finalizeSymptomCheck,
};