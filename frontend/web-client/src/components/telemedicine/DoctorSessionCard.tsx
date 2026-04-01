import { Link } from "react-router-dom";
import { canJoinMeeting } from "../../utils/time";
import type { TelemedicineSession } from "../../services/telemedicineApi";

type Props = {
  session: TelemedicineSession;
};

export default function DoctorSessionCard({ session }: Props) {
  const canJoin = canJoinMeeting(session.scheduledDate, session.scheduledTime);

  const isCompleted = session.status === "completed";
  const isCancelled = session.status === "cancelled";
  const isScheduled = session.status === "scheduled";
  const isActive = session.status === "active";

  const patientName =
    session.patient?.fullName || (session as any).patientName || "Patient";

  function renderPrimaryAction() {
    if (isCompleted) {
      return (
        <Link
          to={`/session-summary/${session.appointmentId}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700 transition-all duration-150 hover:bg-green-100"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          View Summary
        </Link>
      );
    }

    if (isCancelled) {
      return (
        <button
          disabled
          className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-400 opacity-75"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Session Cancelled
        </button>
      );
    }

    if (isScheduled) {
      return (
        <Link
          to={`/waiting-room/${session.appointmentId}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-700 transition-all duration-150 hover:border-sky-300 hover:bg-sky-100"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Open Session Details
        </Link>
      );
    }

    if (isActive || canJoin) {
      return (
        <Link
          to={`/consultation/${session.appointmentId}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-700 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-200 transition-all duration-150 hover:-translate-y-px hover:shadow-lg hover:shadow-sky-300"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Join Consultation
        </Link>
      );
    }

    return (
      <button
        disabled
        className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-400 opacity-75"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Not Available Yet
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md hover:shadow-blue-100">
      <div className="h-1 w-full bg-gradient-to-r from-sky-700 via-sky-400 to-sky-200" />

      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-700 to-sky-400">
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base tracking-tight text-slate-900">
              <span className="font-normal text-slate-500">Patient - </span>
              <span className="font-bold text-slate-900">{patientName}</span>
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Date", value: session.scheduledDate },
            { label: "Time", value: session.scheduledTime },
            { label: "Room", value: session.roomName },
            { label: "Status", value: session.status },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-500">
                {label}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-5 h-px bg-sky-100" />

      <div className="p-5">{renderPrimaryAction()}</div>
    </div>
  );
}
