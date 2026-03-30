import { useState } from "react";
import type { Appointment as AppointmentData } from "../../services/appointmentApi";

type PatientProfile = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type Props = {
  appointment: AppointmentData;
  patient?: PatientProfile;
  onAccept: () => Promise<void> | void;
  onReject: () => Promise<void> | void;
};

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

function getPatientDisplayName(
  appointment: AppointmentData,
  patient?: PatientProfile
) {
  const fullName = `${patient?.firstName || ""} ${patient?.lastName || ""}`.trim();

  return (
    (typeof appointment.patientName === "string" && appointment.patientName.trim()) ||
    fullName ||
    `Patient ${appointment.patientId.slice(-6)}`
  );
}

function getPaymentStatusStyles(paymentStatus?: AppointmentData["paymentStatus"]) {
  if (paymentStatus === "paid") {
    return "text-emerald-700 bg-emerald-50 border-emerald-200";
  }

  if (paymentStatus === "failed") {
    return "text-rose-700 bg-rose-50 border-rose-200";
  }

  return "text-amber-700 bg-amber-50 border-amber-200";
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
  onReject,
}: Props) {
  const [loadingAction, setLoadingAction] = useState<"accept" | "reject" | null>(null);

  const paymentStatusLabel = getPaymentStatusLabel(appointment.paymentStatus);
  const paymentStatusStyles = getPaymentStatusStyles(appointment.paymentStatus);
  const patientName = getPatientDisplayName(appointment, patient);

  const initials = patientName
    .split(" ")
    .filter(Boolean)
    .map((namePart: string) => namePart[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isAccepting = loadingAction === "accept";
  const isRejecting = loadingAction === "reject";
  const isAnyLoading = loadingAction !== null;

  async function handleAccept() {
    if (isAnyLoading) return;

    try {
      setLoadingAction("accept");
      await onAccept();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReject() {
    if (isAnyLoading) return;

    try {
      setLoadingAction("reject");
      await onReject();
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 text-base font-bold text-blue-700 shadow-sm">
            {initials || "PT"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Appointment Request
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-slate-800">
              {patientName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review and manage this patient request
            </p>
          </div>
        </div>

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Date
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {formatDate(appointment.appointmentDate)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Time
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {formatTime(appointment.appointmentTime)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Payment
            </p>
            <div className="mt-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${paymentStatusStyles}`}
              >
                {paymentStatusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isAnyLoading}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center justify-center gap-2">
              {isAccepting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Updating...
                </>
              ) : (
                "Accept Request"
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={handleReject}
            disabled={isAnyLoading}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center justify-center gap-2">
              {isRejecting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                  Updating...
                </>
              ) : (
                "Reject Request"
              )}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}