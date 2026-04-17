const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['APPOINTMENT_BOOKED', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_CANCELLED', 'PAYMENT_SUCCESS', 'PAYMENT_REFUNDED', 'CONSULTATION_COMPLETED'], // ADDED: PAYMENT_REFUNDED
    required: true
  },
  channel: {
    type: String,
    enum: ['EMAIL', 'SMS', 'BOTH'],
    required: true
  },
  recipientType: {
    type: String,
    enum: ['PATIENT', 'DOCTOR'],
    required: true
  },
  recipientId: {
    type: String,
    required: true
  },
  recipientEmail: {
    type: String,
    default: null
  },
  recipientPhone: {
    type: String,
    default: null
  },
  subject: {
    type: String,
    default: null
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED'],
    default: 'PENDING'
  },
  errorMessage: {
    type: String,
    default: null
  },
  metadata: {
    appointmentId: String,
    doctorId: String,
    patientId: String,
    amount: Number,
    orderId: String,
    doctorName: String,
    specialization: String,
    date: String,
    time: String,
  }

}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);