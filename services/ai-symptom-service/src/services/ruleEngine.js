function evaluateSymptoms(input) {
  const {
    fever = false,
    cough = false,
    soreThroat = false,
    chestPain = false,
    shortnessOfBreath = false,
    headache = false,
    blurredVision = false,
    vomiting = false,
    durationDays = 0
  } = input;

  let urgency = "low";
  let category = "general";
  let department = "General Physician";
  let nextStep = "Monitor symptoms and consult a doctor if they worsen.";
  let redFlags = [];

  if (chestPain && shortnessOfBreath) {
    urgency = "high";
    category = "cardio_respiratory_warning";
    department = "Emergency / Cardiology";
    nextStep = "Seek immediate medical attention.";
    redFlags.push("Chest pain with shortness of breath");
  } else if (headache && blurredVision) {
    urgency = "high";
    category = "neurological_warning";
    department = "Neurology / Emergency";
    nextStep = "Urgent doctor consultation is recommended.";
    redFlags.push("Headache with blurred vision");
  } else if (fever && cough && soreThroat) {
    urgency = durationDays >= 5 ? "medium" : "low";
    category = "respiratory_infection";
    department = "General Physician";
    nextStep =
      durationDays >= 5
        ? "Book a doctor appointment because symptoms have lasted several days."
        : "Rest, hydrate, and monitor symptoms.";
  } else if (vomiting && fever) {
    urgency = "medium";
    category = "infection_or_gastro";
    department = "General Physician";
    nextStep = "Consult a doctor soon, especially if dehydration starts.";
  } else if (headache) {
    urgency = "low";
    category = "general_headache";
    department = "General Physician";
    nextStep = "Rest, hydration, and consult a doctor if persistent.";
  }

  return {
    urgency,
    category,
    department,
    nextStep,
    redFlags,
    disclaimer:
      "This is not a final medical diagnosis. Please consult a qualified doctor for professional advice."
  };
}

module.exports = { evaluateSymptoms };