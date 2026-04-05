import { jsPDF } from "jspdf";
import type { Appointment } from "../services/appointmentApi";

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timeString: string) {
  const [hours = "00", minutes = "00"] = timeString.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-LK");
}

function getStatusLabel(appointment: Appointment, rejectionReason: string) {
  if (appointment.status === "cancelled" && rejectionReason) {
    return "Rejected";
  }

  return appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1);
}

function getPaymentLabel(paymentStatus?: Appointment["paymentStatus"]) {
  if (!paymentStatus) {
    return "Pending";
  }

  return paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1);
}

export function getAppointmentReceiptNumber(appointment: Appointment) {
  const idSuffix = appointment._id.slice(-6).toUpperCase();
  const datePart = appointment.appointmentDate.replace(/-/g, "");
  return `APT-${datePart}-${idSuffix}`;
}

function addLabelValueRow(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, 18, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x + 4, y + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const safeValue = value || "-";
  doc.text(doc.splitTextToSize(safeValue, width - 8), x + 4, y + 11);
}

function addSectionText(
  doc: jsPDF,
  title: string,
  value: string,
  y: number
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.text(title.toUpperCase(), 18, y);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(18, y + 4, 174, 22, 3, 3, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(doc.splitTextToSize(value || "-", 164), 22, y + 11);
}

export function downloadAppointmentReceiptPdf(
  appointment: Appointment,
  rejectionReason = ""
) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  const receiptNumber = getAppointmentReceiptNumber(appointment);

  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, 210, 42, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("Appointment Receipt", 18, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Smart Healthcare patient booking confirmation", 18, 26);

  const leftX = 18;
  const rightX = 109;
  const boxWidth = 83;
  let topY = 52;

  addLabelValueRow(doc, "Receipt Number", receiptNumber, leftX, topY, boxWidth);
  addLabelValueRow(
    doc,
    "Booked On",
    formatDateTime(appointment.createdAt),
    rightX,
    topY,
    boxWidth
  );
  topY += 24;

  addLabelValueRow(doc, "Doctor", appointment.doctorName, leftX, topY, boxWidth);
  addLabelValueRow(
    doc,
    "Specialization",
    appointment.specialization,
    rightX,
    topY,
    boxWidth
  );
  topY += 24;

  addLabelValueRow(
    doc,
    "Appointment Date",
    formatDate(appointment.appointmentDate),
    leftX,
    topY,
    boxWidth
  );
  addLabelValueRow(
    doc,
    "Appointment Time",
    formatTime(appointment.appointmentTime),
    rightX,
    topY,
    boxWidth
  );
  topY += 24;

  addLabelValueRow(
    doc,
    "Payment Status",
    getPaymentLabel(appointment.paymentStatus),
    leftX,
    topY,
    boxWidth
  );
  addLabelValueRow(
    doc,
    "Appointment Status",
    getStatusLabel(appointment, rejectionReason),
    rightX,
    topY,
    boxWidth
  );

  let sectionY = topY + 32;
  addSectionText(
    doc,
    "Reason For Appointment",
    appointment.reason?.trim() || "No reason provided.",
    sectionY
  );

  if (rejectionReason) {
    sectionY += 34;
    addSectionText(doc, "Doctor Rejection Reason", rejectionReason, sectionY);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Appointment ID: ${appointment._id}`, 18, 277);
  doc.text(`Generated on: ${formatDateTime(new Date().toISOString())}`, 18, 283);

  doc.save(`${receiptNumber}.pdf`);
}
