import { useState } from "react";
import type { Appointment as AppointmentData } from "../../services/appointmentApi";

type PatientProfile = {
  _id: string;
  authUserId?: string;
  firstName: string;
  lastName: string;
  age?: number | null;
  profileImage?: string;
};

type Props = {
  appointment: AppointmentData;
  patient?: PatientProfile;
  onAccept: () => Promise<void> | void;
  onReschedule: (date: string, time: string) => Promise<void> | void;
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
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
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getPatientDisplayName(appointment: AppointmentData, patient?: PatientProfile) {
  const fullName = `${patient?.firstName || ""} ${patient?.lastName || ""}`.trim();
  return (
    (typeof appointment.patientName === "string" && appointment.patientName.trim()) ||
    fullName ||
    `Patient ${appointment.patientId.slice(-6)}`
  );
}

function getPaymentStatusStyles(paymentStatus?: AppointmentData["paymentStatus"]) {
  if (paymentStatus === "paid") return "text-emerald-700";
  if (paymentStatus === "failed") return "text-rose-700";
  return "text-amber-700";
}

function getPaymentStatusLabel(paymentStatus?: AppointmentData["paymentStatus"]) {
  if (paymentStatus === "paid") return "Paid";
  if (paymentStatus === "failed") return "Failed";
  if (paymentStatus === "pending") return "Pending";
  return "Not available";
}

export default function DoctorAppointmentRequestCard({
  appointment,
  patient,
  onAccept,
  onReschedule,
}: Props) {
  const [loadingAction, setLoadingAction] = useState<"accept" | "reschedule" | null>(null);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [formError, setFormError] = useState("");

  const paymentStatusLabel = getPaymentStatusLabel(appointment.paymentStatus);
  const paymentStatusStyles = getPaymentStatusStyles(appointment.paymentStatus);
  const patientName = getPatientDisplayName(appointment, patient);
  const patientAgeLabel =
    typeof patient?.age === "number" && patient.age >= 0 ? `${patient.age} years` : "";

  const isAccepting = loadingAction === "accept";
  const isRescheduling = loadingAction === "reschedule";
  const isAnyLoading = loadingAction !== null;

  const isPaymentPaid = appointment.paymentStatus === "paid";
  const isAcceptDisabled = isAnyLoading || !isPaymentPaid;

  async function handleAccept() {
    if (isAcceptDisabled) return;
    try {
      setLoadingAction("accept");
      await onAccept();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRescheduleSubmit() {
    setFormError("");

    if (!newDate || !newTime) {
      setFormError("Please select both a date and time.");
      return;
    }

    if (new Date(`${newDate}T${newTime}`) <= new Date()) {
      setFormError("Rescheduled time must be in the future.");
      return;
    }

    try {
      setLoadingAction("reschedule");
      await onReschedule(newDate, newTime);
      setShowRescheduleForm(false);
      setNewDate("");
      setNewTime("");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <article className="group relative mx-auto flex h-full w-full max-w-[30rem] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

      <div className="flex flex-1 flex-col p-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Appointment Request
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <h2 className="truncate text-lg font-semibold text-slate-800">{patientName}</h2>
            {patientAgeLabel && (
              <p className="shrink-0 text-sm font-medium text-slate-500">Age {patientAgeLabel}</p>
            )}
          </div>
        </div>

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Date</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {formatDate(appointment.appointmentDate)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Time</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {formatTime(appointment.appointmentTime)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Payment</p>
            <div className="mt-2">
              <span className={`inline-flex items-center text-sm font-semibold ${paymentStatusStyles}`}>
                {paymentStatusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Reschedule form */}
        {showRescheduleForm && (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="mb-3 text-sm font-semibold text-amber-800">Propose New Schedule</p>

            <div className="flex flex-col gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">New Date</label>
                <input
                  type="date"
                  value={newDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">New Time</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {formError && (
                <p className="text-xs text-rose-600">{formError}</p>
              )}

              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={handleRescheduleSubmit}
                  disabled={isAnyLoading}
                  className="flex-1 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRescheduling ? "Sending..." : "Confirm Reschedule"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRescheduleForm(false); setFormError(""); }}
                  disabled={isAnyLoading}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <div title={!isPaymentPaid ? "Cannot accept — payment not yet completed" : ""}>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isAcceptDisabled}
              className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                isPaymentPaid
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                {isAccepting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Updating...
                  </>
                ) : !isPaymentPaid ? (
                  "Awaiting Payment"
                ) : (
                  "Accept Request"
                )}
              </span>
            </button>
          </div>

          {!showRescheduleForm && (
            <button
              type="button"
              onClick={() => setShowRescheduleForm(true)}
              disabled={isAnyLoading || !isPaymentPaid}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition-all duration-200 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reschedule
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
