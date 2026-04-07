const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"Smart Healthcare Platform" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  };
  const result = await transporter.sendMail(mailOptions);
  return result;
};

module.exports = { sendEmail };