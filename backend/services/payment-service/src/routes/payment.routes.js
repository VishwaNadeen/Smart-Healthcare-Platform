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
router.get('/all', getAllPayments);
router.get('/patient/:patientId', getPatientPaymentHistory);
router.get('/doctor/:doctorId', getDoctorPaymentHistory);
router.get('/:orderId/receipt', downloadReceipt);
router.put('/:orderId/refund', refundPayment);
router.get('/:orderId', getPaymentStatus);

module.exports = router;