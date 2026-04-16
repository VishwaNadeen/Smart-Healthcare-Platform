const Joi = require("joi");

const namePattern = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const countryCodePattern = /^\+[1-9]\d{0,3}$/;
const phonePattern = /^\d{7,15}$/;
const countryPattern = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const nicPattern = /^(?:\d{9}[VvXx]|\d{12})$/;

const titleRule = Joi.string()
  .valid("Mr", "Miss", "Mrs")
  .required()
  .messages({
    "any.only": "Please select a valid title",
    "any.required": "Title is required",
  });

const nameRule = (label) =>
  Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(namePattern)
    .required()
    .messages({
      "string.empty": `${label} is required`,
      "string.min": `${label} must be at least 2 characters`,
      "string.max": `${label} must be 50 characters or fewer`,
      "string.pattern.base": `${label} can contain only letters, spaces, apostrophes, and hyphens`,
      "any.required": `${label} is required`,
    });

const emailRule = Joi.string().trim().lowercase().email().required().messages({
  "string.empty": "Email is required",
  "string.email": "Enter a valid email address",
  "any.required": "Email is required",
});

const nicRule = Joi.string().trim().pattern(nicPattern).required().messages({
  "string.empty": "NIC is required",
  "string.pattern.base": "NIC must be 12 digits or 9 digits followed by V/X",
  "any.required": "NIC is required",
});

const passwordRule = Joi.string()
  .min(6)
  .max(100)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
  .required()
  .messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
    "string.max": "Password must be 100 characters or fewer",
    "string.pattern.base":
      "Password must include uppercase, lowercase, number, and special character",
    "any.required": "Password is required",
  });

const countryCodeRule = Joi.string()
  .trim()
  .pattern(countryCodePattern)
  .required()
  .messages({
    "string.empty": "Country code is required",
    "string.pattern.base": "Country code must look like +94",
    "any.required": "Country code is required",
  });

const phoneRule = Joi.string().trim().pattern(phonePattern).required().messages({
  "string.empty": "Phone number is required",
  "string.pattern.base": "Phone number must contain only digits and be 7 to 15 digits long",
  "any.required": "Phone number is required",
});

const birthdayRule = Joi.date()
  .iso()
  .max("now")
  .required()
  .messages({
    "date.base": "Birthday must be a valid date",
    "date.format": "Birthday must be a valid ISO date",
    "date.max": "Birthday cannot be in the future",
    "any.required": "Birthday is required",
  });

const genderRule = Joi.string()
  .valid("male", "female", "other")
  .optional()
  .messages({
    "any.only": "Please select a valid gender",
  });

const addressRule = Joi.string().trim().max(255).allow("").optional().messages({
  "string.max": "Address must be 255 characters or fewer",
});

const countryRule = Joi.string()
  .trim()
  .min(2)
  .max(100)
  .pattern(countryPattern)
  .required()
  .messages({
    "string.empty": "Country is required",
    "string.min": "Country must be at least 2 characters",
    "string.max": "Country must be 100 characters or fewer",
    "string.pattern.base":
      "Country can contain only letters, spaces, periods, apostrophes, and hyphens",
    "any.required": "Country is required",
  });

const createPatientSchema = Joi.object({
  title: titleRule,
  firstName: nameRule("First name"),
  lastName: nameRule("Last name"),
  nic: nicRule,
  email: emailRule,
  password: passwordRule,
  countryCode: countryCodeRule,
  phone: phoneRule,
  birthday: birthdayRule,
  address: addressRule,
  country: countryRule,
});

const updateCurrentPatientSchema = Joi.object({
  title: titleRule.optional(),
  firstName: nameRule("First name").optional(),
  lastName: nameRule("Last name").optional(),
  nic: nicRule.optional(),
  email: emailRule.optional(),
  countryCode: countryCodeRule.optional(),
  phone: phoneRule.optional(),
  birthday: birthdayRule.optional(),
  gender: genderRule.optional(),
  address: addressRule,
  country: countryRule.optional(),
}).min(1).messages({
  "object.min": "At least one field is required to update the profile",
});

const deleteCurrentPatientSchema = Joi.object({
  password: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Password is required",
    "string.max": "Password must be 100 characters or fewer",
    "any.required": "Password is required",
  }),
});

module.exports = {
  createPatientSchema,
  updateCurrentPatientSchema,
  deleteCurrentPatientSchema,
};
