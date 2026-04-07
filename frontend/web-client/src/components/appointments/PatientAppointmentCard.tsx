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
      return "text-amber-700";
    case "confirmed":
      return "text-emerald-700";
    case "completed":
      return "text-blue-700";
    case "cancelled":
      return "text-rose-700";
    default:
      return "text-slate-700";
  }
}

function getPaymentClasses(status: Appointment["paymentStatus"]) {
  switch (status) {
    case "paid":
      return "text-emerald-700";
    case "failed":
      return "text-rose-700";
    default:
      return "text-amber-700";
  }
}

export default function PatientAppointmentCard({
  appointment,
  onCancel,
  isCancelling,
}: PatientAppointmentCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="min-w-0">
        <h3 className="truncate text-lg font-bold text-slate-900">
          {appointment.doctorName}
        </h3>
        <p className="mt-1 text-sm font-medium text-cyan-700">
          {appointment.specialization}
        </p>
      </div>

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

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payment
          </p>
          <span
            className={`mt-1 inline-flex text-sm font-semibold capitalize ${getPaymentClasses(
              appointment.paymentStatus
            )}`}
          >
            {appointment.paymentStatus}
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
          </p>
          <span
            className={`mt-1 inline-flex text-sm font-semibold capitalize ${getStatusClasses(
              appointment.status
            )}`}
          >
            {appointment.status}
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
            to={`/patient-waiting-room/${appointment._id}`}
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
