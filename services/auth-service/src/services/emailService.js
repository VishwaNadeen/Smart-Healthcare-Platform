const nodemailer = require("nodemailer");

let transporter;

const isMailConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );

const getTransporter = () => {
  if (!isMailConfigured()) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in auth-service/.env"
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
};

const sendOtpEmail = async ({ to, username, otp, purpose, expiresInMinutes }) => {
  const transporterInstance = getTransporter();
  const purposeLabel =
    purpose === "verify-email"
      ? "Email Verification"
      : purpose === "reset"
        ? "Password Reset"
        : "Login Verification";

  await transporterInstance.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `${purposeLabel} Code - Smart Healthcare`,
    text:
      `Hello ${username},\n\n` +
      `Your ${purposeLabel.toLowerCase()} code is ${otp}.\n` +
      `This code will expire in ${expiresInMinutes} minutes.\n\n` +
      `If you did not request this, please ignore this email.\n`,
    html:
      `<p>Hello ${username},</p>` +
      `<p>Your <strong>${purposeLabel.toLowerCase()}</strong> code is:</p>` +
      `<h2 style="letter-spacing:4px;">${otp}</h2>` +
      `<p>This code will expire in ${expiresInMinutes} minutes.</p>` +
      `<p>If you did not request this, please ignore this email.</p>`,
  });
};

module.exports = {
  isMailConfigured,
  sendOtpEmail,
};
