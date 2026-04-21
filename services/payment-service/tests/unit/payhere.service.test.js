const { generateHash, verifyNotification, getCheckoutUrl } = require('../../src/services/payhere.service');

describe('PayHere Service - Unit Tests', () => {

  describe('generateHash', () => {
    it('should generate a valid MD5 hash string', () => {
      const hash = generateHash('1234726', 'ORD-001', 1000, 'LKR', 'SECRET123');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(32);
    });

    it('should return uppercase hash', () => {
      const hash = generateHash('1234726', 'ORD-001', 1000, 'LKR', 'SECRET123');
      expect(hash).toBe(hash.toUpperCase());
    });

    it('should produce consistent hash for same inputs', () => {
      const hash1 = generateHash('1234726', 'ORD-001', 1000, 'LKR', 'SECRET123');
      const hash2 = generateHash('1234726', 'ORD-001', 1000, 'LKR', 'SECRET123');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different order IDs', () => {
      const hash1 = generateHash('1234726', 'ORD-001', 1000, 'LKR', 'SECRET123');
      const hash2 = generateHash('1234726', 'ORD-002', 1000, 'LKR', 'SECRET123');
      expect(hash1).not.toBe(hash2);
    });

    it('should format amount to 2 decimal places', () => {
      const hash1 = generateHash('1234726', 'ORD-001', 1000, 'LKR', 'SECRET');
      const hash2 = generateHash('1234726', 'ORD-001', 1000.00, 'LKR', 'SECRET');
      expect(hash1).toBe(hash2);
    });
  });

  describe('verifyNotification', () => {
    it('should return true for a valid notification signature', () => {
      const merchantId = '1234726';
      const orderId = 'ORD-001';
      const amount = '1000.00';
      const currency = 'LKR';
      const statusCode = '2';
      const secret = 'SECRET123';

      const validHash = generateHash(merchantId, orderId, amount, currency, secret);
      const md5 = require('md5');
      const hashedSecret = md5(secret).toUpperCase();
      const correctHash = md5(merchantId + orderId + parseFloat(amount).toFixed(2) + currency + statusCode + hashedSecret).toUpperCase();

      const result = verifyNotification(merchantId, orderId, amount, currency, statusCode, secret, correctHash);
      expect(result).toBe(true);
    });

    it('should return false for an invalid signature', () => {
      const result = verifyNotification('1234726', 'ORD-001', '1000.00', 'LKR', '2', 'SECRET123', 'WRONGHASH');
      expect(result).toBe(false);
    });

    it('should return false if amount is tampered', () => {
      const md5 = require('md5');
      const secret = 'SECRET123';
      const hashedSecret = md5(secret).toUpperCase();
      const originalHash = md5('1234726' + 'ORD-001' + '1000.00' + 'LKR' + '2' + hashedSecret).toUpperCase();
      const result = verifyNotification('1234726', 'ORD-001', '9999.00', 'LKR', '2', secret, originalHash);
      expect(result).toBe(false);
    });
  });

  describe('getCheckoutUrl', () => {
    it('should return sandbox URL when PAYHERE_SANDBOX is true', () => {
      process.env.PAYHERE_SANDBOX = 'true';
      const url = getCheckoutUrl();
      expect(url).toBe('https://sandbox.payhere.lk/pay/checkout');
    });

    it('should return production URL when PAYHERE_SANDBOX is false', () => {
      process.env.PAYHERE_SANDBOX = 'false';
      const url = getCheckoutUrl();
      expect(url).toBe('https://www.payhere.lk/pay/checkout');
    });

    afterEach(() => {
      process.env.PAYHERE_SANDBOX = 'true';
    });
  });
});
