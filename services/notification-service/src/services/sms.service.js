const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// UPDATED: switched from SMS to WhatsApp — Sri Lankan carriers block Twilio trial SMS
const sendSMS = async ({ to, message }) => {
  const result = await client.messages.create({
    body: message,
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`
  });
  return result;
};


module.exports = { sendSMS };