const twilio = require('twilio');

let client = null;

const getClient = () => {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !sid.startsWith('AC') || !token) {
      throw new Error('Twilio credentials not configured');
    }
    client = twilio(sid, token);
  }
  return client;
};

// UPDATED: switched from SMS to WhatsApp — Sri Lankan carriers block Twilio trial SMS
const sendSMS = async ({ to, message }) => {
  const result = await getClient().messages.create({
    body: message,
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`
  });
  return result;
};


module.exports = { sendSMS };