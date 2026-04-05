const { GoogleGenAI } = require("@google/genai");
const { GEMINI_API_KEY, GEMINI_MODEL } = require("../config/env");

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function generatePatientFriendlyExplanation(data) {
  const prompt = `
You are a healthcare assistant for a student project.
Do not claim a confirmed diagnosis.
Explain clearly and safely.

Patient symptom analysis result:
${JSON.stringify(data, null, 2)}

Write a short patient-friendly response with:
1. What the result generally suggests
2. Urgency level
3. Which doctor/department is recommended
4. What action the patient should take next
5. A short safety disclaimer
`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  return response.text;
}

async function chatWithPatient({ symptomCheck, message }) {
  const previousChat = (symptomCheck.chatHistory || [])
    .map((item) => `${item.role === "user" ? "Patient" : "Assistant"}: ${item.message}`)
    .join("\n");

  const prompt = `
You are a healthcare assistant for a student project.

Important safety rules:
- You are not a doctor
- Do not provide a final diagnosis
- Do not prescribe medication
- Keep answers short, clear, and safe
- If urgency is high, strongly advise urgent medical care
- Base your answer on the stored symptom analysis below
- Be conversational and helpful

Stored symptom check:
${JSON.stringify(
  {
    symptoms: symptomCheck.symptoms,
    analysis: symptomCheck.analysis,
    recommendation: symptomCheck.recommendation,
    aiExplanation: symptomCheck.aiExplanation,
  },
  null,
  2
)}

Previous chat:
${previousChat || "No previous chat"}

New patient message:
${message}

Reply as a helpful healthcare assistant.
`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  return response.text;
}

module.exports = {
  generatePatientFriendlyExplanation,
  chatWithPatient,
};