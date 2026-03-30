import { Link } from "react-router-dom";
import { canJoinMeeting } from "../../utils/time";
import type { TelemedicineSession } from "../../services/telemedicineApi";
import StatusBadge from "./StatusBadge";
import type { TelemedicineActorRole } from "../../utils/telemedicineAuth";

type SessionCardProps = {
  session: TelemedicineSession;
  role?: TelemedicineActorRole;
};

function getDisplayValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getSessionName(
  session: TelemedicineSession,
  key: "doctor" | "patient"
) {
  const data = session as TelemedicineSession & {
    doctorName?: string;
    doctorFullName?: string;
    patientName?: string;
    patientFullName?: string;
  };

  if (key === "doctor") {
    return (
      getDisplayValue(data.doctorName, "") ||
      getDisplayValue(data.doctorFullName, "") ||
      "Doctor"
    );
  }

  return (
    getDisplayValue(data.patientName, "") ||
    getDisplayValue(data.patientFullName, "") ||
    "Patient"
  );
}

export default function SessionCard({
  session,
  role = "patient",
}: SessionCardProps) {
  const canJoin = canJoinMeeting(
    session.scheduledDate,
    session.scheduledTime
  );

  const isDoctor = role === "doctor";
  const isCompleted = session.status === "completed";
  const isCancelled = session.status === "cancelled";
  const isScheduled = session.status === "scheduled";
  const isActive = session.status === "active";

  const doctorName = getSessionName(session, "doctor");
  const patientName = getSessionName(session, "patient");

  function renderPrimaryAction() {
    if (isCompleted) {
      return (
        <Link
          to={`/session-summary/${session.appointmentId}`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:flex-1"
        >
          View Summary
        </Link>
      );
    }

    if (isCancelled) {
      return (
        <button
          disabled
          className="w-full cursor-not-allowed rounded-xl bg-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 sm:flex-1"
        >
          Session Cancelled
        </button>
      );
    }

    if (!isDoctor && isScheduled) {
      return (
        <Link
          to={`/waiting-room/${session.appointmentId}`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 sm:flex-1"
        >
          Open Waiting Room
        </Link>
      );
    }

    if (isDoctor && isScheduled) {
      return (
        <Link
          to={`/waiting-room/${session.appointmentId}`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:flex-1"
        >
          Open Waiting Room
        </Link>
      );
    }

    if (isActive || canJoin) {
      return (
        <Link
          to={`/consultation/${session.appointmentId}`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:flex-1"
        >
          Join Consultation
        </Link>
      );
    }

    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 sm:flex-1"
      >
        Consultation Not Available Yet
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-base font-bold text-blue-700">
              {isDoctor ? "PT" : "DR"}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="break-words text-lg font-bold text-slate-900">
                  {isDoctor ? patientName : doctorName}
                </h3>
                <StatusBadge status={session.status} />
              </div>

              <p className="mt-1 text-sm font-medium text-cyan-700">
                {isDoctor ? "Patient Session" : "Doctor Consultation"}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                {isDoctor ? (
                  <>
                    <span className="font-semibold text-slate-700">Doctor:</span>{" "}
                    {doctorName}
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-700">Patient:</span>{" "}
                    {patientName}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {session.scheduledDate || "Not available"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Time
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {session.scheduledTime || "Not available"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Room Name
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                {session.roomName || "Not available"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Session Status
              </p>
              <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
                {session.status || "Not available"}
              </p>
            </div>
          </div>

          {session.notes?.trim() && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notes
              </p>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">
                {session.notes}
              </p>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          {renderPrimaryAction()}
        </div>
      </div>
    </div>
  );
}
