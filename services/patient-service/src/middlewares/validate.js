const validate = (schema, target = "body") => (req, res, next) => {
  const data = req[target];

  const { error, value } = schema.validate(data, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    const fieldErrors = error.details.reduce((acc, item) => {
      const field = item.path?.[0];

      if (typeof field === "string" && !acc[field]) {
        acc[field] = item.message;
      }

      return acc;
    }, {});

    return res.status(400).json({
      message: "Validation failed",
      errors: error.details.map((item) => item.message),
      fieldErrors,
    });
  }

  req[target] = value;
  next();
};

module.exports = validate;
