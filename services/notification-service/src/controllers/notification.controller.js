const Notification = require('../models/notification.model');
const { sendEmail } = require('../services/email.service');
const { sendSMS } = require('../services/sms.service');
const templates = require('../templates/email.template');

const sendNotification = async (req, res) => {
  try {
    const {
      type, channel, recipientType, recipientId,
      recipientEmail, recipientPhone, recipientName,
      metadata
    } = req.body;

    const smsMessages = {
      APPOINTMENT_BOOKED: `Smart Healthcare: Your appointment ${metadata?.appointmentId} has been booked successfully.`,
      APPOINTMENT_RESCHEDULED: `Smart Healthcare: Your appointment ${metadata?.appointmentId} has been rescheduled.`,
      APPOINTMENT_CANCELLED: `Smart Healthcare: Your appointment ${metadata?.appointmentId} has been cancelled.`,
      PAYMENT_SUCCESS: `Smart Healthcare: Payment of LKR ${metadata?.amount} for appointment ${metadata?.appointmentId} was successful.`,
      CONSULTATION_COMPLETED: `Smart Healthcare: Your consultation for appointment ${metadata?.appointmentId} is completed.`
    };

    const emailSubjects = {
      APPOINTMENT_BOOKED: 'Appointment Confirmed - Smart Healthcare',
      APPOINTMENT_RESCHEDULED: 'Appointment Rescheduled - Smart Healthcare',
      APPOINTMENT_CANCELLED: 'Appointment Cancelled - Smart Healthcare',
      PAYMENT_SUCCESS: 'Payment Successful - Smart Healthcare',
      CONSULTATION_COMPLETED: 'Consultation Completed - Smart Healthcare'
    };

    const emailTemplates = {
      APPOINTMENT_BOOKED: templates.appointmentBooked,
      APPOINTMENT_RESCHEDULED: templates.appointmentRescheduled,
      APPOINTMENT_CANCELLED: templates.appointmentCancelled,
      PAYMENT_SUCCESS: templates.paymentSuccess,
      CONSULTATION_COMPLETED: templates.consultationCompleted
    };

    const message = smsMessages[type];
    const subject = emailSubjects[type];
    const templateData = { recipientName, ...metadata };

    const notification = new Notification({
      type, channel, recipientType, recipientId,
      recipientEmail, recipientPhone,
      subject, message,
      metadata
    });

    let emailError = null;
    let smsError = null;

    // Send Email
    if ((channel === 'EMAIL' || channel === 'BOTH') && recipientEmail) {
      try {
        await sendEmail({
          to: recipientEmail,
          subject,
          html: emailTemplates[type](templateData)
        });
      } catch (err) {
        emailError = err.message;
      }
    }

    // Send SMS
    if ((channel === 'SMS' || channel === 'BOTH') && recipientPhone) {
      try {
        await sendSMS({ to: recipientPhone, message });
      } catch (err) {
        smsError = err.message;
      }
    }

    if (emailError || smsError) {
      notification.status = 'FAILED';
      notification.errorMessage = [emailError, smsError].filter(Boolean).join(' | ');
    } else {
      notification.status = 'SENT';
    }

    await notification.save();

    res.status(200).json({
      message: notification.status === 'SENT' ? 'Notification sent successfully' : 'Notification failed',
      status: notification.status,
      notification
    });
  } catch (error) {
    res.status(500).json({ message: 'Notification sending failed', error: error.message });
  }
};

const getNotificationHistory = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.params.recipientId
    }).sort({ createdAt: -1 });
    res.status(200).json({ total: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

const getAllNotifications = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ total: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

module.exports = { sendNotification, getNotificationHistory, getAllNotifications };