const appointmentBooked = (data) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #2c7be5; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Smart Healthcare Platform</h1>
  </div>
  <div style="padding: 30px; background-color: #f8f9fa;">
    <h2 style="color: #2c7be5;">Appointment Confirmed! ✅</h2>
    <p>Dear ${data.recipientName},</p>
    <p>Your appointment has been successfully booked.</p>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Appointment Details</h3>
      <p><strong>Appointment ID:</strong> ${data.appointmentId}</p>
      <p><strong>Doctor:</strong> ${data.doctorName}</p>
      <p><strong>Date:</strong> ${data.date}</p>
      <p><strong>Time:</strong> ${data.time}</p>
    </div>
    <p>Thank you for choosing Smart Healthcare Platform.</p>
  </div>
</div>`;

const appointmentRescheduled = (data) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #f6c343; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Smart Healthcare Platform</h1>
  </div>
  <div style="padding: 30px; background-color: #f8f9fa;">
    <h2 style="color: #f6c343;">Appointment Rescheduled 🔄</h2>
    <p>Dear ${data.recipientName},</p>
    <p>Your appointment has been rescheduled.</p>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">New Appointment Details</h3>
      <p><strong>Appointment ID:</strong> ${data.appointmentId}</p>
      <p><strong>Doctor:</strong> ${data.doctorName}</p>
      <p><strong>New Date:</strong> ${data.date}</p>
      <p><strong>New Time:</strong> ${data.time}</p>
    </div>
    <p>Thank you for choosing Smart Healthcare Platform.</p>
  </div>
</div>`;

const appointmentCancelled = (data) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #e63757; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Smart Healthcare Platform</h1>
  </div>
  <div style="padding: 30px; background-color: #f8f9fa;">
    <h2 style="color: #e63757;">Appointment Cancelled ❌</h2>
    <p>Dear ${data.recipientName},</p>
    <p>Your appointment has been cancelled.</p>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Appointment ID:</strong> ${data.appointmentId}</p>
      <p><strong>Doctor:</strong> ${data.doctorName}</p>
      <p><strong>Date:</strong> ${data.date}</p>
    </div>
    <p>Please contact us if you need to rebook.</p>
  </div>
</div>`;

const paymentSuccess = (data) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #00d97e; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Smart Healthcare Platform</h1>
  </div>
  <div style="padding: 30px; background-color: #f8f9fa;">
    <h2 style="color: #00d97e;">Payment Successful! 💳</h2>
    <p>Dear ${data.recipientName},</p>
    <p>Your payment has been processed successfully.</p>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Payment Details</h3>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Amount:</strong> LKR ${data.amount}</p>
      <p><strong>Appointment ID:</strong> ${data.appointmentId}</p>
      <p><strong>Status:</strong> <span style="color: green;">SUCCESS</span></p>
    </div>
    <p>Thank you for using Smart Healthcare Platform.</p>
  </div>
</div>`;

const consultationCompleted = (data) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #2c7be5; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Smart Healthcare Platform</h1>
  </div>
  <div style="padding: 30px; background-color: #f8f9fa;">
    <h2 style="color: #2c7be5;">Consultation Completed! 🩺</h2>
    <p>Dear ${data.recipientName},</p>
    <p>Your consultation with ${data.doctorName} has been completed.</p>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Appointment ID:</strong> ${data.appointmentId}</p>
      <p><strong>Doctor:</strong> ${data.doctorName}</p>
      <p><strong>Date:</strong> ${data.date}</p>
    </div>
    <p>Your prescription will be available shortly.</p>
    <p>Thank you for choosing Smart Healthcare Platform.</p>
  </div>
</div>`;

module.exports = {
  appointmentBooked,
  appointmentRescheduled,
  appointmentCancelled,
  paymentSuccess,
  consultationCompleted
};