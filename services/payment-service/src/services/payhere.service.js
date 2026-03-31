const md5 = require('md5');

const generateHash = (merchantId, orderId, amount, currency, merchantSecret) => {
  const hashedSecret = md5(merchantSecret).toUpperCase();
  const formattedAmount = parseFloat(amount).toFixed(2);
  const hash = md5(
    merchantId + orderId + formattedAmount + currency + hashedSecret
  ).toUpperCase();
  return hash;
};

const verifyNotification = (merchantId, orderId, amount, currency, statusCode, merchantSecret, receivedHash) => {
  const hashedSecret = md5(merchantSecret).toUpperCase();
  const formattedAmount = parseFloat(amount).toFixed(2);
  const generatedHash = md5(
    merchantId + orderId + formattedAmount + currency + statusCode + hashedSecret
  ).toUpperCase();
  return generatedHash === receivedHash;
};

const getCheckoutUrl = () => {
  const isSandbox = process.env.PAYHERE_SANDBOX === 'true';
  return isSandbox
    ? 'https://sandbox.payhere.lk/pay/checkout'
    : 'https://www.payhere.lk/pay/checkout';
};

module.exports = { generateHash, verifyNotification, getCheckoutUrl };