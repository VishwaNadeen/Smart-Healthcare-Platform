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
    contents: prompt
  });

  return response.text;
}

module.exports = { generatePatientFriendlyExplanation };