const symptomFields = [
  {
    id: "fever",
    question: "Do you have fever?",
    type: "boolean",
    defaultValue: false,
  },
  {
    id: "cough",
    question: "Do you have cough?",
    type: "boolean",
    defaultValue: false,
  },
  {
    id: "soreThroat",
    question: "Do you have sore throat?",
    type: "boolean",
    defaultValue: false,
  },
  {
    id: "chestPain",
    question: "Do you have chest pain?",
    type: "boolean",
    defaultValue: false,
  },
  {
    id: "shortnessOfBreath",
    question: "Do you have shortness of breath?",
    type: "boolean",
    defaultValue: false,
  },
  {
    id: "headache",
    question: "Do you have headache?",
    type: "boolean",
    defaultValue: false,
  },
  {
    id: "blurredVision",
    question: "Do you have blurred vision?",
    type: "boolean",
    defaultValue: false,
  },
  {
    id: "vomiting",
    question: "Do you have vomiting?",
    type: "boolean",
    defaultValue: false,
  },
  {
    id: "durationDays",
    question: "How many days have you had these symptoms?",
    type: "number",
    defaultValue: 0,
    min: 0,
  },
];

const booleanSymptomFields = symptomFields.filter((field) => field.type === "boolean");
const numberSymptomFields = symptomFields.filter((field) => field.type === "number");

module.exports = {
  symptomFields,
  booleanSymptomFields,
  numberSymptomFields,
};