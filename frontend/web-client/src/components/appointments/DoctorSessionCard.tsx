import { Link } from "react-router-dom";
import type { TelemedicineSession } from "../../services/telemedicineApi";

function formatDate(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleDateString(undefined, {
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

type SessionCardProps = {
  session: TelemedicineSession;
  actionLabel: string;
  actionTo: string;
};

export default function SessionCard({
  session,
  actionLabel,
  actionTo,
}: SessionCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Appointment ID: {session.appointmentId}
          </p>

          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            Doctor Consultation Slot
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {formatDate(session.scheduledDate)} • {formatTime(session.scheduledTime)}
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${
            session.status === "completed"
              ? "bg-emerald-100 text-emerald-700"
              : session.status === "active"
              ? "bg-blue-100 text-blue-700"
              : session.status === "cancelled"
              ? "bg-rose-100 text-rose-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {session.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to={`/session/${session.appointmentId}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View Details
        </Link>

        <Link
          to={actionTo}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}