const {requireAuth} = require('../middleware/auth.middleware');
const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  handleNotification,
  getPaymentStatus,
  getPatientPaymentHistory,
  getDoctorPaymentHistory,
  getAllPayments,
  refundPayment,
  downloadReceipt
} = require('../controllers/payment.controller');



router.post('/initiate', initiatePayment);
router.post('/notify', handleNotification);
router.get('/all', requireAuth, getAllPayments);
router.get('/patient/:patientId',requireAuth, getPatientPaymentHistory);
router.get('/doctor/:doctorId',requireAuth, getDoctorPaymentHistory);
router.get('/:orderId/receipt', downloadReceipt);
router.put('/:orderId/refund', requireAuth, refundPayment);
router.get('/:orderId', getPaymentStatus);

module.exports = router;