const symptomQuestions = require("../utils/symptomQuestions");
const { evaluateSymptoms, normalizeSymptoms } = require("../services/ruleEngine");
const { chatWithPatient } = require("../services/geminiService");
const { buildRecommendation } = require("../services/recommendationService");
const SymptomCheck = require("../models/SymptomCheck");
const {
  getQuestionById,
  getNextQuestionPlan,
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
} = require("../services/symptomInterviewService");

function getAuthenticatedPatientId(req) {
  return (
    req.user?.patientProfileId ||
    req.user?.patientId ||
    req.user?.userId ||
    req.user?.id ||
    ""
  );
}

function serializeSymptomCheck(symptomCheck) {
  const raw =
    typeof symptomCheck.toObject === "function"
      ? symptomCheck.toObject()
      : { ...symptomCheck };

  return {
    ...raw,
    currentQuestion: raw.currentQuestionId
      ? getQuestionById(raw.currentQuestionId)
      : null,
  };
}

function applyNextQuestionPlan(symptomCheck) {
  const plan = getNextQuestionPlan(symptomCheck.symptoms || {});

  if (plan.type === "complete") {
    symptomCheck.currentQuestionId = "";
    return {
      complete: true,
      assistantMessage: "",
    };
  }

  if (plan.type === "group_boolean") {
    symptomCheck.currentQuestionId = plan.questionIds[0] || "";
    return {
      complete: false,
      assistantMessage: buildGroupQuestionPrompt(plan.questionIds),
    };
  }

  const nextQuestionId = plan.questionIds[0] || "";
  symptomCheck.currentQuestionId = nextQuestionId;

  return {
    complete: false,
    assistantMessage: buildQuestionPrompt(getQuestionById(nextQuestionId)),
  };
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

async function startSymptomConversation(req, res, next) {
  try {
    const authenticatedPatientId = String(getAuthenticatedPatientId(req)).trim();
    const initialMessage = String(req.body?.message || "").trim();

    if (!authenticatedPatientId) {
      return res.status(401).json({
        success: false,
        message: "Logged-in patient ID was not found from token.",
      });
    }

    if (!initialMessage) {
      return res.status(400).json({
        success: false,
        message: "Initial message is required.",
      });
    }

    const extractedSymptoms = extractSymptomsFromInitialMessage(initialMessage);

    const symptomCheck = new SymptomCheck({
      patientId: authenticatedPatientId,
      flowType: "chat",
      conversationStage: "collecting",
      initialMessage,
      symptoms: extractedSymptoms,
      chatHistory: [
        {
          role: "user",
          message: initialMessage,
          timestamp: new Date(),
        },
      ],
      status: "follow_up_pending",
    });

    let assistantMessage = "";

    if (isGreetingOnly(initialMessage) && Object.keys(extractedSymptoms).length === 0) {
      symptomCheck.currentQuestionId = "";
      assistantMessage = buildWelcomePrompt();
    } else {
      const planResult = applyNextQuestionPlan(symptomCheck);

      if (planResult.complete) {
        await finalizeSymptomCheck(symptomCheck);
        assistantMessage =
          symptomCheck.aiExplanation ||
          "I have completed your symptom analysis.";
      } else {
        assistantMessage = planResult.assistantMessage;
      }
    }

    symptomCheck.chatHistory.push({
      role: "assistant",
      message: assistantMessage,
      timestamp: new Date(),
    });

    await symptomCheck.save();

    return res.status(201).json({
      success: true,
      message: "Symptom conversation started successfully.",
      data: serializeSymptomCheck(symptomCheck),
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

    const normalizedSymptoms = normalizeSymptoms(symptoms);
    const ruleResult = evaluateSymptoms(normalizedSymptoms);
    const recommendation = buildRecommendation(ruleResult);

    const savedCheck = await SymptomCheck.create({
      patientId: authenticatedPatientId,
      flowType: "form",
      conversationStage: "completed",
      symptoms: normalizedSymptoms,
      analysis: ruleResult,
      recommendation,
      status: "completed",
      currentQuestionId: "",
    });

    await finalizeSymptomCheck(savedCheck);

    savedCheck.chatHistory.push({
      role: "assistant",
      message:
        savedCheck.aiExplanation ||
        "Your symptom analysis has been completed successfully.",
      timestamp: new Date(),
    });

    await savedCheck.save();

    return res.status(201).json({
      success: true,
      message: "Symptom analysis completed and saved successfully.",
      data: serializeSymptomCheck(savedCheck),
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
      data: history.map(serializeSymptomCheck),
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
      data: serializeSymptomCheck(symptomCheck),
    });
  } catch (error) {
    next(error);
  }
}

async function chatAboutSymptomCheck(req, res, next) {
  try {
    const authenticatedPatientId = String(getAuthenticatedPatientId(req)).trim();
    const { id } = req.params;
    const message = String(req.body?.message || "").trim();

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

    if (symptomCheck.conversationStage === "closed" || symptomCheck.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "This symptom check is already closed. Chat is no longer allowed.",
      });
    }

    const userMessage = {
      role: "user",
      message,
      timestamp: new Date(),
    };

    symptomCheck.chatHistory.push(userMessage);

    let assistantReply = "";
    let responseMessage = "Chat saved successfully.";

    if (symptomCheck.conversationStage !== "completed") {
      if (!symptomCheck.currentQuestionId) {
        const extractedSymptoms = extractSymptomsFromInitialMessage(message);

        if (Object.keys(extractedSymptoms).length === 0) {
          assistantReply = buildWelcomePrompt();
        } else {
          symptomCheck.symptoms = mergeExtractedSymptoms(
            symptomCheck.symptoms || {},
            extractedSymptoms
          );

          const planResult = applyNextQuestionPlan(symptomCheck);

          if (planResult.complete) {
            await finalizeSymptomCheck(symptomCheck);
            assistantReply =
              symptomCheck.aiExplanation ||
              "I have completed your symptom analysis.";
            responseMessage = "Symptom analysis completed successfully.";
          } else {
            assistantReply = planResult.assistantMessage;
            responseMessage = "Symptom details saved and next question generated.";
          }
        }
      } else {
        const currentQuestionId = symptomCheck.currentQuestionId;
        const currentGroup = getGroupForQuestionId(currentQuestionId);

        if (currentGroup && currentGroup !== "duration") {
          const plan = getNextQuestionPlan(symptomCheck.symptoms || {});
          const groupQuestionIds = plan.questionIds || [];

          const groupedAnswers = parseGroupedBooleanAnswer(message, groupQuestionIds);

          if (Object.keys(groupedAnswers).length > 0) {
            symptomCheck.symptoms = mergeExtractedSymptoms(
              symptomCheck.symptoms || {},
              groupedAnswers
            );

            const additionallyExtracted = extractSymptomsFromInitialMessage(message);
            symptomCheck.symptoms = mergeExtractedSymptoms(
              symptomCheck.symptoms || {},
              additionallyExtracted
            );

            const planResult = applyNextQuestionPlan(symptomCheck);

            if (planResult.complete) {
              await finalizeSymptomCheck(symptomCheck);
              assistantReply =
                symptomCheck.aiExplanation ||
                "I have completed your symptom analysis.";
              responseMessage = "Symptom analysis completed successfully.";
            } else {
              assistantReply = planResult.assistantMessage;
              responseMessage = "Answer saved and next question generated.";
            }
          } else {
            const parsedAnswer = parseAnswerForQuestion(currentQuestionId, message);

            if (!parsedAnswer.valid) {
              assistantReply =
                "Thanks. Please answer using symptom names or say yes/no clearly so I can continue.";
            } else {
              symptomCheck.symptoms = mergeExtractedSymptoms(
                symptomCheck.symptoms || {},
                {
                  [currentQuestionId]: parsedAnswer.value,
                }
              );

              const planResult = applyNextQuestionPlan(symptomCheck);

              if (planResult.complete) {
                await finalizeSymptomCheck(symptomCheck);
                assistantReply =
                  symptomCheck.aiExplanation ||
                  "I have completed your symptom analysis.";
                responseMessage = "Symptom analysis completed successfully.";
              } else {
                assistantReply = planResult.assistantMessage;
                responseMessage = "Answer saved and next question generated.";
              }
            }
          }
        } else {
          const parsedAnswer = parseAnswerForQuestion(currentQuestionId, message);

          if (!parsedAnswer.valid) {
            assistantReply =
              parsedAnswer.errorMessage ||
              "Please answer the question in the expected format.";
          } else {
            symptomCheck.symptoms = mergeExtractedSymptoms(
              symptomCheck.symptoms || {},
              {
                [currentQuestionId]: parsedAnswer.value,
              }
            );

            const planResult = applyNextQuestionPlan(symptomCheck);

            if (planResult.complete) {
              await finalizeSymptomCheck(symptomCheck);
              assistantReply =
                symptomCheck.aiExplanation ||
                "I have completed your symptom analysis.";
              responseMessage = "Symptom analysis completed successfully.";
            } else {
              assistantReply = planResult.assistantMessage;
              responseMessage = "Answer saved and next question generated.";
            }
          }
        }
      }
    } else {
      try {
        assistantReply = await chatWithPatient({
          symptomCheck,
          message,
        });
      } catch (geminiError) {
        console.error("Gemini chat failed:", geminiError.message);
        assistantReply =
          "Sorry, the AI chat is currently unavailable. Please consult a doctor if you need urgent medical advice.";
      }

      if (symptomCheck.status === "completed") {
        symptomCheck.status = "follow_up_pending";
      }
    }

    const assistantMessage = {
      role: "assistant",
      message: assistantReply,
      timestamp: new Date(),
    };

    symptomCheck.chatHistory.push(assistantMessage);
    await symptomCheck.save();

    return res.status(200).json({
      success: true,
      message: responseMessage,
      data: {
        symptomCheckId: symptomCheck._id,
        userMessage,
        assistantMessage,
        chatHistory: symptomCheck.chatHistory,
        symptomCheck: serializeSymptomCheck(symptomCheck),
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
      data: latestRecord ? serializeSymptomCheck(latestRecord) : null,
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
    symptomCheck.conversationStage = "closed";
    await symptomCheck.save();

    return res.json({
      success: true,
      message: "Symptom check marked as closed successfully.",
      data: serializeSymptomCheck(symptomCheck),
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

    symptomCheck.status =
      symptomCheck.analysis?.urgency ? "completed" : "follow_up_pending";

    symptomCheck.conversationStage =
      symptomCheck.analysis?.urgency ? "completed" : "collecting";

    await symptomCheck.save();

    return res.json({
      success: true,
      message: "Symptom check reopened successfully.",
      data: serializeSymptomCheck(symptomCheck),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getQuestions,
  startSymptomConversation,
  analyzeSymptoms,
  getSymptomHistory,
  getSymptomCheckById,
  chatAboutSymptomCheck,
  getLatestSymptomCheck,
  closeSymptomCheck,
  reopenSymptomCheck,
};