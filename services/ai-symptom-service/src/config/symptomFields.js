const symptomFields = [
  {
    id: "fever",
    question: "Do you have fever?",
    type: "boolean",
    defaultValue: false,
    order: 1,
  },
  {
    id: "cough",
    question: "Do you have cough?",
    type: "boolean",
    defaultValue: false,
    order: 2,
  },
  {
    id: "soreThroat",
    question: "Do you have sore throat?",
    type: "boolean",
    defaultValue: false,
    order: 3,
  },
  {
    id: "chestPain",
    question: "Do you have chest pain?",
    type: "boolean",
    defaultValue: false,
    order: 4,
  },
  {
    id: "shortnessOfBreath",
    question: "Do you have shortness of breath?",
    type: "boolean",
    defaultValue: false,
    order: 5,
  },
  {
    id: "headache",
    question: "Do you have headache?",
    type: "boolean",
    defaultValue: false,
    order: 6,
  },
  {
    id: "blurredVision",
    question: "Do you have blurred vision?",
    type: "boolean",
    defaultValue: false,
    order: 7,
  },
  {
    id: "vomiting",
    question: "Do you have vomiting?",
    type: "boolean",
    defaultValue: false,
    order: 8,
  },
  {
    id: "durationDays",
    question: "How many days have you had these symptoms?",
    type: "number",
    defaultValue: 0,
    min: 0,
    order: 9,
  },
];

const sortedSymptomFields = [...symptomFields].sort(
  (a, b) => (a.order || 0) - (b.order || 0)
);

const booleanSymptomFields = sortedSymptomFields.filter(
  (field) => field.type === "boolean"
);

const numberSymptomFields = sortedSymptomFields.filter(
  (field) => field.type === "number"
);

module.exports = {
  symptomFields: sortedSymptomFields,
  booleanSymptomFields,
  numberSymptomFields,
};