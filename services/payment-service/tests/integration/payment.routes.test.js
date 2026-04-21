const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');

let mongoServer;
let app;

// Mock external service calls
global.fetch = jest.fn();

// Mock auth middleware to inject user
jest.mock('../../src/middleware/auth.middleware', () => ({
  requireAuth: (req, res, next) => {
    req.user = { _id: 'test-user-id', role: 'patient' };
    next();
  },
}));

jest.mock('../../src/services/notificationService', () => ({ notify: jest.fn() }));

process.env.PAYHERE_MERCHANT_ID = '1234726';
process.env.PAYHERE_MERCHANT_SECRET = 'TESTSECRET';
process.env.PAYHERE_SANDBOX = 'true';
process.env.NOTIFY_URL = 'https://example.ngrok.io/api/payments/notify';
process.env.RETURN_URL = 'http://smart-healthcare.local/payment/success';
process.env.CANCEL_URL = 'http://smart-healthcare.local/payment/cancel';
process.env.DOCTOR_SERVICE_URL = 'http://doctor-service:5003';
process.env.APPOINTMENT_SERVICE_URL = 'http://appointment-service:5001';
process.env.INTERNAL_SERVICE_SECRET = 'test_secret';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/payments', require('../../src/routes/payment.routes'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const Payment = require('../../src/models/Payment.model');
  await Payment.deleteMany({});
  jest.clearAllMocks();
});

describe('Integration Tests - Payment Routes', () => {

  describe('POST /api/payments/initiate', () => {
    it('should create a new payment and return checkout params', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ doctor: { consultationFee: 4000 } }),
      });

      const res = await request(app)
        .post('/api/payments/initiate')
        .send({
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          doctorName: 'Dr. Test',
          specialization: 'Cardiology',
          appointmentId: 'appt-1',
          amount: 4000,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '0771234567',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.checkoutUrl).toBe('https://sandbox.payhere.lk/pay/checkout');
      expect(res.body.params).toHaveProperty('merchant_id');
      expect(res.body.params).toHaveProperty('hash');
      expect(res.body.params.amount).toBe('4000.00');
    });

    it('should return 400 when amount does not match consultation fee', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ doctor: { consultationFee: 5000 } }),
      });

      const res = await request(app)
        .post('/api/payments/initiate')
        .send({
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          appointmentId: 'appt-1',
          amount: 4000,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '0771234567',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/does not match/);
    });

    it('should return 400 when appointment already paid', async () => {
      const Payment = require('../../src/models/Payment.model');
      await Payment.create({
        orderId: 'ORD-existing',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentId: 'appt-1',
        amount: 4000,
        status: 'SUCCESS',
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ doctor: { consultationFee: 4000 } }),
      });

      const res = await request(app)
        .post('/api/payments/initiate')
        .send({
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          appointmentId: 'appt-1',
          amount: 4000,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '0771234567',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/already been paid/);
    });
  });

  describe('GET /api/payments/:orderId', () => {
    it('should return payment by orderId', async () => {
      const Payment = require('../../src/models/Payment.model');
      await Payment.create({
        orderId: 'ORD-test-001',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentId: 'appt-1',
        amount: 4000,
        status: 'SUCCESS',
      });

      const res = await request(app).get('/api/payments/ORD-test-001');

      expect(res.statusCode).toBe(200);
      expect(res.body.orderId).toBe('ORD-test-001');
      expect(res.body.status).toBe('SUCCESS');
    });

    it('should return 404 for non-existent orderId', async () => {
      const res = await request(app).get('/api/payments/ORD-nonexistent');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/payments/notify (webhook)', () => {
    it('should update payment status to SUCCESS on status_code 2', async () => {
      const Payment = require('../../src/models/Payment.model');
      await Payment.create({
        orderId: 'ORD-webhook-001',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentId: 'appt-1',
        amount: 4000,
        status: 'PENDING',
      });

      // Mock appointment update call
      global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      const md5 = require('md5');
      const merchantId = '1234726';
      const orderId = 'ORD-webhook-001';
      const amount = '4000.00';
      const currency = 'LKR';
      const statusCode = '2';
      const secret = 'TESTSECRET';
      const hashedSecret = md5(secret).toUpperCase();
      const hash = md5(merchantId + orderId + amount + currency + statusCode + hashedSecret).toUpperCase();

      const res = await request(app)
        .post('/api/payments/notify')
        .send({
          merchant_id: merchantId,
          order_id: orderId,
          payhere_amount: amount,
          payhere_currency: currency,
          status_code: statusCode,
          md5sig: hash,
          payment_id: 'PAY-123',
          status_message: 'Successfully completed',
          method: 'VISA',
        });

      expect(res.statusCode).toBe(200);
      const updated = await Payment.findOne({ orderId: 'ORD-webhook-001' });
      expect(updated.status).toBe('SUCCESS');
    });

    it('should return 400 for invalid signature', async () => {
      const res = await request(app)
        .post('/api/payments/notify')
        .send({
          merchant_id: '1234726',
          order_id: 'ORD-001',
          payhere_amount: '4000.00',
          payhere_currency: 'LKR',
          status_code: '2',
          md5sig: 'INVALIDSIGNATURE',
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /api/payments/:orderId/refund', () => {
    it('should refund a SUCCESS payment', async () => {
      const Payment = require('../../src/models/Payment.model');
      await Payment.create({
        orderId: 'ORD-refund-001',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentId: 'appt-1',
        amount: 4000,
        status: 'SUCCESS',
      });

      global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      const res = await request(app).put('/api/payments/ORD-refund-001/refund');

      expect(res.statusCode).toBe(200);
      const updated = await Payment.findOne({ orderId: 'ORD-refund-001' });
      expect(updated.status).toBe('REFUNDED');
    });

    it('should return 400 when trying to refund a non-SUCCESS payment', async () => {
      const Payment = require('../../src/models/Payment.model');
      await Payment.create({
        orderId: 'ORD-refund-002',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentId: 'appt-1',
        amount: 4000,
        status: 'PENDING',
      });

      const res = await request(app).put('/api/payments/ORD-refund-002/refund');

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Only successful payments/);
    });

    it('should return 404 for non-existent orderId', async () => {
      const res = await request(app).put('/api/payments/ORD-nonexistent/refund');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/payments/patient/:patientId', () => {
    it('should return payment history for a patient', async () => {
      const Payment = require('../../src/models/Payment.model');
      await Payment.create([
        { orderId: 'ORD-p1', patientId: 'patient-1', doctorId: 'D1', appointmentId: 'A1', amount: 1000, status: 'SUCCESS' },
        { orderId: 'ORD-p2', patientId: 'patient-1', doctorId: 'D1', appointmentId: 'A2', amount: 2000, status: 'PENDING' },
      ]);

      const res = await request(app).get('/api/payments/patient/patient-1');

      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.payments).toHaveLength(2);
    });
  });
});
