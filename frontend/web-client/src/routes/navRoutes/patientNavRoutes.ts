export const patientNavRoutes = [
  { name: "Appointments", path: "/appointments/patient" },
  { name: "Consultation", path: "/patient-sessions" },
  { name: "Prescriptions", path: "/prescriptions" },
  { name: "Medical History", path: "/medical-history" },
  { name: "Payments", path: "/payment/history" }, // FIXED: was /payments (wrong path)

  { name: "Canceled", path: "/appointments/cancelled" },
  { name: "Rescheduled", path: "/appointments/rescheduled" },
];
