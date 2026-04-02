import { Link } from "react-router-dom";
import { canJoinMeeting } from "../../utils/time";
import type { TelemedicineSession } from "../../services/telemedicineApi";
import StatusBadge from "./StatusBadge";

type Props = {
  session: TelemedicineSession;
};

export default function PatientSessionCard({ session }: Props) {
  const canJoin = canJoinMeeting(session.scheduledDate, session.scheduledTime);

  const isCompleted = session.status === "completed";
  const isCancelled = session.status === "cancelled";
  const isScheduled = session.status === "scheduled";
  const isActive = session.status === "active";

  const doctorName =
    session.doctor?.fullName || (session as any).doctorName || "Doctor";
  const statusText =
    session.status === "active"
      ? "Active"
      : session.status.charAt(0).toUpperCase() + session.status.slice(1);

  function renderPrimaryAction() {
    if (isCompleted) {
      return (
        <Link
          to={`/session-summary/${session.appointmentId}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#bbf7d0] bg-[#f0fdf4] px-5 py-[11px] text-[14px] font-semibold tracking-[-0.01em] text-[#166534] no-underline transition-all duration-200 ease-in-out box-border hover:bg-[#dcfce7]"
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
            <polyline points="10 9 9 9 8 9" />
          </svg>
          View Summary
        </Link>
      );
    }

    if (isCancelled) {
      return (
        <button
          disabled
          className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-5 py-[11px] text-[14px] font-semibold tracking-[-0.01em] text-[#94a3b8] opacity-75 transition-all duration-200 ease-in-out box-border"
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
          to={`/patient-waiting-room/${session.appointmentId}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#bfdbfe] bg-[#eff6ff] px-5 py-[11px] text-[14px] font-semibold tracking-[-0.01em] text-[#1d4ed8] no-underline transition-all duration-200 ease-in-out box-border hover:border-[#93c5fd] hover:bg-[#dbeafe]"
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
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Open Waiting Room
        </Link>
      );
    }

    if (isActive || canJoin) {
      return (
        <Link
          to={`/consultation/${session.appointmentId}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] border-none bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_100%)] px-5 py-[11px] text-[14px] font-semibold tracking-[-0.01em] text-white no-underline shadow-[0_4px_14px_rgba(29,78,216,0.35)] transition-all duration-200 ease-in-out box-border hover:-translate-y-[1px] hover:bg-[linear-gradient(135deg,#1e40af_0%,#1d4ed8_100%)] hover:shadow-[0_6px_20px_rgba(29,78,216,0.45)]"
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
        className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-5 py-[11px] text-[14px] font-semibold tracking-[-0.01em] text-[#94a3b8] opacity-75 transition-all duration-200 ease-in-out box-border"
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

  const primaryAction = renderPrimaryAction();

  return (
    <div
      className="relative overflow-hidden rounded-[20px] border border-[#dbeafe] bg-white p-0 font-sans shadow-[0_2px_8px_rgba(37,99,235,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-in-out hover:-translate-y-[1px] hover:shadow-[0_8px_28px_rgba(37,99,235,0.12),0_2px_8px_rgba(0,0,0,0.06)]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="h-1 w-full bg-[linear-gradient(90deg,#1d4ed8_0%,#3b82f6_50%,#93c5fd_100%)]" />

      <div className="flex flex-col gap-[20px] px-5 pb-6 pt-6">
        <div className="flex items-center gap-[16px]">
          <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#1d4ed8_0%,#3b82f6_100%)]">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.15)_0%,transparent_60%)]" />
            <svg
              className="relative z-10 text-white"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[16px] font-bold tracking-[-0.02em] text-[#0f172a]">
                {doctorName}
              </h3>
              <div className="ml-auto flex shrink-0 items-center">
                {isActive ? (
                  <span
                    className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[#22c55e] shadow-[0_0_0_4px_rgba(34,197,94,0.16)]"
                    aria-label="Active session"
                    title="Active session"
                  />
                ) : null}
                {!isScheduled && !isActive && <StatusBadge status={session.status} />}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-[2px] rounded-[12px] border border-[#dbeafe] bg-[#f0f7ff] px-3 py-[10px]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#3b82f6]">
              Date
            </span>
            <span className="text-[13px] font-semibold text-[#0f172a]">
              {session.scheduledDate}
            </span>
          </div>

          <div className="flex flex-col gap-[2px] rounded-[12px] border border-[#dbeafe] bg-[#f0f7ff] px-3 py-[10px]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#3b82f6]">
              Time
            </span>
            <span className="text-[13px] font-semibold text-[#0f172a]">
              {session.scheduledTime}
            </span>
          </div>

          <div className="flex flex-col gap-[2px] rounded-[12px] border border-[#dbeafe] bg-[#f0f7ff] px-3 py-[10px]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#3b82f6]">
              Room
            </span>
            <span className="text-[13px] font-semibold text-[#0f172a]">
              {session.roomName}
            </span>
          </div>

          <div className="flex flex-col gap-[2px] rounded-[12px] border border-[#dbeafe] bg-[#f0f7ff] px-3 py-[10px]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#3b82f6]">
              Status
            </span>
            <span
              className={`text-[13px] font-semibold ${
                session.status === "active" ? "text-[#16a34a]" : "text-[#0f172a]"
              }`}
            >
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {primaryAction ? (
        <>
          <div className="mx-[-20px] h-px bg-[#dbeafe]" />
          <div className="px-5 pb-5 pt-4">{primaryAction}</div>
        </>
      ) : null}
    </div>
  );
}
