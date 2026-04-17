const Joi = require("joi");

const email = Joi.string().trim().lowercase().email().required().messages({
  "string.empty": "Email is required",
  "string.email": "Enter a valid email address",
  "any.required": "Email is required",
});

const password = Joi.string()
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

const currentPassword = Joi.string().min(1).max(100).required().messages({
  "string.empty": "Password is required",
  "string.max": "Password must be 100 characters or fewer",
  "any.required": "Password is required",
});

const username = Joi.string()
  .trim()
  .min(2)
  .max(120)
  .pattern(/^[A-Za-z]+(?:[ '-][A-Za-z]+)*(\s[A-Za-z]+(?:[ '-][A-Za-z]+)*)*$/)
  .required()
  .messages({
    "string.empty": "Username is required",
    "string.min": "Username must be at least 2 characters",
    "string.max": "Username must be 120 characters or fewer",
    "string.pattern.base":
      "Username can contain only letters, spaces, apostrophes, and hyphens",
    "any.required": "Username is required",
  });

const otp = Joi.string()
  .trim()
  .pattern(/^[0-9]{4,8}$/)
  .required()
  .messages({
    "string.pattern.base": "OTP must contain only digits",
  });

const roleOptional = Joi.string()
  .valid("doctor", "patient", "admin")
  .optional();

const registerSchema = Joi.object({
  username,
  email,
  password,
  role: Joi.string().valid("doctor", "patient").required(),
});

const loginSchema = Joi.object({
  email,
  password: currentPassword,
});

const requestEmailVerificationSchema = Joi.object({
  email,
});

const verifyEmailSchema = Joi.object({
  email,
  otp,
});

const requestLoginOtpSchema = Joi.object({
  identifier: Joi.string().trim().min(3).max(100).required(),
  role: roleOptional,
});

const verifyLoginOtpSchema = Joi.object({
  identifier: Joi.string().trim().min(3).max(100).required(),
  otp,
  role: roleOptional,
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email(),
  identifier: Joi.string().trim().lowercase().email(),
})
  .or("email", "identifier")
  .messages({
    "object.missing": "Email is required",
  });

const resetPasswordSchema = Joi.object({
  identifier: Joi.string().trim().lowercase().email().required(),
  otp,
  newPassword: password,
});

const verifyPasswordSchema = Joi.object({
  password: currentPassword,
});

const deleteByEmailInternalSchema = Joi.object({
  email,
});

const updateUserIdentityInternalSchema = Joi.object({
  username,
  email,
});

module.exports = {
  registerSchema,
  loginSchema,
  requestEmailVerificationSchema,
  verifyEmailSchema,
  requestLoginOtpSchema,
  verifyLoginOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyPasswordSchema,
  deleteByEmailInternalSchema,
  updateUserIdentityInternalSchema,
};
