import { Link } from "react-router-dom";
import type { Appointment } from "../../services/appointmentApi";

type PatientAppointmentCardProps = {
  appointment: Appointment;
  onCancel: (appointmentId: string) => void;
  isCancelling: boolean;
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

function getStatusClasses(status: Appointment["status"]) {
  switch (status) {
    case "pending":
      return "border border-amber-200 bg-amber-100 text-amber-700";
    case "confirmed":
      return "border border-emerald-200 bg-emerald-100 text-emerald-700";
    case "completed":
      return "border border-blue-200 bg-blue-100 text-blue-700";
    case "cancelled":
      return "border border-rose-200 bg-rose-100 text-rose-700";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getPaymentClasses(status: Appointment["paymentStatus"]) {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700";
    case "failed":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export default function PatientAppointmentCard({
  appointment,
  onCancel,
  isCancelling,
}: PatientAppointmentCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-slate-900">
            {appointment.doctorName}
          </h3>
          <p className="mt-1 text-sm font-medium text-cyan-700">
            {appointment.specialization}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
            appointment.status
          )}`}
        >
          {appointment.status}
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Appointment ID
        </p>
        <p className="mt-1 break-all text-sm font-semibold text-slate-800">
          {appointment._id}
        </p>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
        {appointment.reason?.trim() || "No reason provided for this appointment."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Date
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatDate(appointment.appointmentDate)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Time
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatTime(appointment.appointmentTime)}
          </p>
        </div>

        <div className="col-span-2 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payment
          </p>
          <span
            className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getPaymentClasses(
              appointment.paymentStatus
            )}`}
          >
            {appointment.paymentStatus}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <Link
          to={`/appointments/${appointment._id}`}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          View Details
        </Link>

        {appointment.status === "confirmed" && (
          <Link
            to={`/waiting-room/${appointment._id}`}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Open Waiting Room
          </Link>
        )}

        {appointment.status === "pending" && (
          <button
            type="button"
            onClick={() => onCancel(appointment._id)}
            disabled={isCancelling}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCancelling ? "Cancelling..." : "Cancel Appointment"}
          </button>
        )}
      </div>
    </div>
  );
}