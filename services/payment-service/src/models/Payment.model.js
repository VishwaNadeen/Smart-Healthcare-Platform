const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  patientId: {
    type: String,
    required: true
  },
  doctorId: {
    type: String,
    required: true
  },
  doctorName: {         // ADDED: for payment history display
    type: String,
    default: ""
  },
  specialization: {     // ADDED: for payment history display
    type: String,
    default: ""
  },
  appointmentId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'],
    default: 'PENDING'
  },
  payherePaymentId: {
    type: String,
    default: null
  },
  payhereStatusCode: {
    type: String,
    default: null
  },
  payhereStatusMessage: {
    type: String,
    default: null
  },
  payhereMethod: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);