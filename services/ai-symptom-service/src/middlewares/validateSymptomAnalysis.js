const {
  symptomFields,
  booleanSymptomFields,
  numberSymptomFields,
} = require("../config/symptomFields");

function validateSymptomAnalysis(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: "A valid symptom request body is required.",
    });
  }

  const keys = Object.keys(body);

  if (keys.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one symptom field is required.",
    });
  }

  const allowedFields = symptomFields.map((field) => field.id);

  for (const key of keys) {
    if (!allowedFields.includes(key)) {
      return res.status(400).json({
        success: false,
        message: `Invalid field provided: ${key}`,
      });
    }
  }

  for (const field of booleanSymptomFields) {
    if (field.id in body && typeof body[field.id] !== "boolean") {
      return res.status(400).json({
        success: false,
        message: `${field.id} must be a boolean value.`,
      });
    }
  }

  for (const field of numberSymptomFields) {
    if (field.id in body) {
      const value = body[field.id];

      if (typeof value !== "number" || Number.isNaN(value)) {
        return res.status(400).json({
          success: false,
          message: `${field.id} must be a valid number.`,
        });
      }

      if (typeof field.min === "number" && value < field.min) {
        return res.status(400).json({
          success: false,
          message: `${field.id} cannot be less than ${field.min}.`,
        });
      }
    }
  }

  const hasAtLeastOnePositiveBoolean = booleanSymptomFields.some(
    (field) => body[field.id] === true
  );

  const hasNumberField = numberSymptomFields.some((field) => field.id in body);

  if (!hasAtLeastOnePositiveBoolean && !hasNumberField) {
    return res.status(400).json({
      success: false,
      message: "At least one symptom or duration field is required.",
    });
  }

  return next();
}

module.exports = validateSymptomAnalysis;