const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const Payment = require('../models/Payment.model');
const { generateHash, verifyNotification, getCheckoutUrl } = require('../services/payhere.service');

//helper: get doctorConsultationFee form doctor service

const getDoctorConsultationFee = async (doctorId) => {
  const res = await fetch(
    `${process.env.DOCTOR_SERVICE_URL}/api/doctors/${doctorId}`
  );
  if (!res.ok) throw new Error('Failed to fetch doctor details');
  const data = await res.json();
  return data?.doctor?.consultationFee ?? data?.consultationFee ?? null;
};

//helper: tell appointment service to update paymentStatus after PayHere webhook
const updateAppointmentPaymentStatus = async (appointmentId, paymentStatus) => {
  try {
    await fetch(
      `${process.env.APPOINTMENT_SERVICE_URL}/api/appointments/internal/${appointmentId}/payment-status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service-secret': process.env.INTERNAL_SERVICE_SECRET || '',
        },
        body: JSON.stringify({ paymentStatus }),
      }
    );
  } catch (err) {
    console.error('[PaymentService] Failed to update appointment payment status:', err.message);
  }
};

// POST /api/payments/initiateconst 
const initiatePayment = async (req, res) => {
  try {
    const {
      patientId, doctorId, appointmentId, amount,
      firstName, lastName, email, phone, currency = 'LKR'
    } = req.body;

    // Validate amount against doctor's actual consultation fee
    const consultationFee = await getDoctorConsultationFee(doctorId);
    if (consultationFee === null) {
      return res.status(400).json({ message: 'Could not verify doctor consultation fee' });
    }
    if (parseFloat(amount) !== parseFloat(consultationFee)) {
      return res.status(400).json({
        message: 'Amount does not match the doctor consultation fee',
        expected: consultationFee,
      });
    }

    const orderId = `ORD-${uuidv4()}`;

    const payment = new Payment({
      orderId, patientId, doctorId, appointmentId, amount, currency
    });
    await payment.save();

    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    const hash = generateHash(merchantId, orderId, amount, currency, merchantSecret);

    res.status(200).json({
      checkoutUrl: getCheckoutUrl(),
      params: {
        merchant_id: merchantId,
        return_url: process.env.RETURN_URL,
        cancel_url: process.env.CANCEL_URL,
        notify_url: process.env.NOTIFY_URL,
        order_id: orderId,
        items: `Appointment - ${appointmentId}`,
        currency,
        amount: parseFloat(amount).toFixed(2),
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        address: 'N/A',
        city: 'Colombo',
        country: 'Sri Lanka',
        hash
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment initiation failed', error: error.message });
  }
};


// POST /api/payments/notify — PayHere webhook
const handleNotification = async (req, res) => {
  try {
    const {
      merchant_id, order_id, payhere_amount, payhere_currency,
      status_code, md5sig, payment_id, status_message, method
    } = req.body;

    const isValid = verifyNotification(
      merchant_id, order_id, payhere_amount,
      payhere_currency, status_code,
      process.env.PAYHERE_MERCHANT_SECRET, md5sig
    );

    if (!isValid) return res.status(400).send('Invalid signature');

    const statusMap = {
      '2': 'SUCCESS',
      '0': 'PENDING',
      '-1': 'CANCELLED',
      '-2': 'FAILED',
      '-3': 'REFUNDED'
    };

    const updatedPayment = await Payment.findOneAndUpdate(
      { orderId: order_id },
      {
        status: statusMap[status_code] || 'FAILED',
        payherePaymentId: payment_id,
        payhereStatusCode: status_code,
        payhereStatusMessage: status_message,
        payhereMethod: method
      },
      { new: true }  // returns the updated document
    );

    // Sync paymentStatus back to appointment-service
    if (updatedPayment) {
      const appointmentPaymentStatus =
        statusMap[status_code] === 'SUCCESS' ? 'paid' :
        statusMap[status_code] === 'FAILED'  ? 'failed' : null;

      if (appointmentPaymentStatus) {
        updateAppointmentPaymentStatus(updatedPayment.appointmentId, appointmentPaymentStatus);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    res.status(500).send('Notification handling failed');
  }
};


// GET /api/payments/:orderId
const getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payment', error: error.message });
  }
};

// GET /api/payments/patient/:patientId
const getPatientPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ patientId: req.params.patientId })
      .sort({ createdAt: -1 });
    res.status(200).json({
      total: payments.length,
      payments
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patient payments', error: error.message });
  }
};

// GET /api/payments/doctor/:doctorId
const getDoctorPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ doctorId: req.params.doctorId })
      .sort({ createdAt: -1 });

    const totalEarnings = payments
      .filter(p => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      total: payments.length,
      totalEarnings,
      payments
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching doctor payments', error: error.message });
  }
};

// GET /api/payments/all — Admin only
const getAllPayments = async (req, res) => {
  try {
    const { status, from, to } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const payments = await Payment.find(filter).sort({ createdAt: -1 });

    const totalRevenue = payments
      .filter(p => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      total: payments.length,
      totalRevenue,
      payments
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payments', error: error.message });
  }
};

// PUT /api/payments/:orderId/refund
const refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status !== 'SUCCESS') {
      return res.status(400).json({ message: 'Only successful payments can be refunded' });
    }

    payment.status = 'REFUNDED';
    await payment.save();

    res.status(200).json({ message: 'Payment refunded successfully', payment });
  } catch (error) {
    res.status(500).json({ message: 'Refund failed', error: error.message });
  }
};

// GET /api/payments/:orderId/receipt — Download PDF
const downloadReceipt = async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status !== 'SUCCESS') {
      return res.status(400).json({ message: 'Receipt only available for successful payments' });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.orderId}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('Smart Healthcare Platform', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Payment Details
    doc.fontSize(12).font('Helvetica-Bold').text('Payment Details');
    doc.moveDown(0.5);

    const details = [
      ['Order ID',        payment.orderId],
      ['Appointment ID',  payment.appointmentId],
      ['Patient ID',      payment.patientId],
      ['Doctor ID',       payment.doctorId],
      ['Amount',          `${payment.currency} ${payment.amount.toFixed(2)}`],
      ['Payment Method',  payment.payhereMethod || 'N/A'],
      ['Status',          payment.status],
      ['Transaction ID',  payment.payherePaymentId || 'N/A'],
      ['Date',            new Date(payment.createdAt).toLocaleString()]
    ];

    details.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(value);
    });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(10).font('Helvetica')
      .text('Thank you for using Smart Healthcare Platform.', { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Receipt generation failed', error: error.message });
  }
};

module.exports = {
  initiatePayment,
  handleNotification,
  getPaymentStatus,
  getPatientPaymentHistory,
  getDoctorPaymentHistory,
  getAllPayments,
  refundPayment,
  downloadReceipt
};