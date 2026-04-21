const httpMocks = require('node-mocks-http');

jest.mock('../../src/models/Payment.model');
jest.mock('../../src/services/notificationService', () => ({ notify: jest.fn() }));

const Payment = require('../../src/models/Payment.model');

process.env.PAYHERE_MERCHANT_ID = '1234726';
process.env.PAYHERE_MERCHANT_SECRET = 'TESTSECRET';
process.env.PAYHERE_SANDBOX = 'true';
process.env.NOTIFY_URL = 'https://example.ngrok.io/api/payments/notify';
process.env.RETURN_URL = 'http://smart-healthcare.local/payment/success';
process.env.CANCEL_URL = 'http://smart-healthcare.local/payment/cancel';
process.env.DOCTOR_SERVICE_URL = 'http://doctor-service:5003';
process.env.APPOINTMENT_SERVICE_URL = 'http://appointment-service:5001';
process.env.INTERNAL_SERVICE_SECRET = 'test_secret';

const {
  getPaymentStatus,
  getPatientPaymentHistory,
  getDoctorPaymentHistory,
  getAllPayments,
} = require('../../src/controllers/payment.controller');

describe('Payment Controller - Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPaymentStatus', () => {
    it('should return 200 with payment when found', async () => {
      const mockPayment = { orderId: 'ORD-001', status: 'SUCCESS', amount: 1000 };
      Payment.findOne = jest.fn().mockResolvedValue(mockPayment);

      const req = httpMocks.createRequest({ params: { orderId: 'ORD-001' } });
      const res = httpMocks.createResponse();

      await getPaymentStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toMatchObject(mockPayment);
    });

    it('should return 404 when payment not found', async () => {
      Payment.findOne = jest.fn().mockResolvedValue(null);

      const req = httpMocks.createRequest({ params: { orderId: 'ORD-999' } });
      const res = httpMocks.createResponse();

      await getPaymentStatus(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on database error', async () => {
      Payment.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      const req = httpMocks.createRequest({ params: { orderId: 'ORD-001' } });
      const res = httpMocks.createResponse();

      await getPaymentStatus(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getPatientPaymentHistory', () => {
    it('should return 200 with payments array and total', async () => {
      const mockPayments = [
        { orderId: 'ORD-001', patientId: 'P1', status: 'SUCCESS', amount: 1000 },
        { orderId: 'ORD-002', patientId: 'P1', status: 'PENDING', amount: 2000 },
      ];
      Payment.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(mockPayments) });

      const req = httpMocks.createRequest({ params: { patientId: 'P1' } });
      const res = httpMocks.createResponse();

      await getPatientPaymentHistory(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.total).toBe(2);
      expect(data.payments).toHaveLength(2);
    });

    it('should return empty array when no payments found', async () => {
      Payment.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

      const req = httpMocks.createRequest({ params: { patientId: 'P_NONE' } });
      const res = httpMocks.createResponse();

      await getPatientPaymentHistory(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.total).toBe(0);
      expect(data.payments).toHaveLength(0);
    });
  });

  describe('getDoctorPaymentHistory', () => {
    it('should calculate totalEarnings from SUCCESS payments only', async () => {
      const mockPayments = [
        { orderId: 'ORD-001', doctorId: 'D1', status: 'SUCCESS', amount: 1000 },
        { orderId: 'ORD-002', doctorId: 'D1', status: 'FAILED', amount: 2000 },
        { orderId: 'ORD-003', doctorId: 'D1', status: 'SUCCESS', amount: 3000 },
      ];
      Payment.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(mockPayments) });

      const req = httpMocks.createRequest({ params: { doctorId: 'D1' } });
      const res = httpMocks.createResponse();

      await getDoctorPaymentHistory(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.totalEarnings).toBe(4000);
      expect(data.total).toBe(3);
    });

    it('should return zero earnings when no successful payments', async () => {
      const mockPayments = [
        { orderId: 'ORD-001', doctorId: 'D1', status: 'FAILED', amount: 1000 },
      ];
      Payment.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(mockPayments) });

      const req = httpMocks.createRequest({ params: { doctorId: 'D1' } });
      const res = httpMocks.createResponse();

      await getDoctorPaymentHistory(req, res);

      const data = JSON.parse(res._getData());
      expect(data.totalEarnings).toBe(0);
    });
  });

  describe('getAllPayments', () => {
    it('should return all payments with totalRevenue from SUCCESS only', async () => {
      const mockPayments = [
        { orderId: 'ORD-001', status: 'SUCCESS', amount: 5000 },
        { orderId: 'ORD-002', status: 'REFUNDED', amount: 3000 },
      ];
      Payment.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(mockPayments) });

      const req = httpMocks.createRequest({ query: {} });
      const res = httpMocks.createResponse();

      await getAllPayments(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.totalRevenue).toBe(5000);
      expect(data.total).toBe(2);
    });

    it('should filter by status when query param provided', async () => {
      Payment.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

      const req = httpMocks.createRequest({ query: { status: 'SUCCESS' } });
      const res = httpMocks.createResponse();

      await getAllPayments(req, res);

      expect(Payment.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'SUCCESS' }));
    });
  });
});
