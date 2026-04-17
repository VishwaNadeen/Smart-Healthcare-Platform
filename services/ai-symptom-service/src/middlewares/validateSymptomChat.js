function validateSymptomChat(req, res, next) {
  const { message } = req.body || {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Message is required.",
    });
  }

  if (message.trim().length > 1000) {
    return res.status(400).json({
      success: false,
      message: "Message must be 1000 characters or less.",
    });
  }

  return next();
}

module.exports = validateSymptomChat;