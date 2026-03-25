import { Link } from "react-router-dom";
import { canJoinMeeting } from "../../utils/time";
import type { TelemedicineSession } from "../../services/telemedicineApi";
import StatusBadge from "./StatusBadge";

type SessionCardProps = {
  session: TelemedicineSession;
  role?: "doctor" | "patient";
};

export default function SessionCard({
  session,
  role = "patient",
}: SessionCardProps) {
  const canJoin = canJoinMeeting(
    session.scheduledDate,
    session.scheduledTime
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            Appointment #{session.appointmentId}
          </h3>
          <p className="mt-1 text-sm text-gray-500">Room: {session.roomName}</p>
        </div>

        <StatusBadge status={session.status} />
      </div>

      <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
        <p>
          <span className="font-semibold">Date:</span> {session.scheduledDate}
        </p>

        <p>
          <span className="font-semibold">Time:</span> {session.scheduledTime}
        </p>

        {role === "doctor" ? (
          <p>
            <span className="font-semibold">Patient ID:</span> {session.patientId}
          </p>
        ) : (
          <p>
            <span className="font-semibold">Doctor ID:</span> {session.doctorId}
          </p>
        )}

        <p>
          <span className="font-semibold">Meeting:</span>{" "}
          <a
            href={session.meetingLink}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            Open Link
          </a>
        </p>
      </div>

      {session.notes?.trim() && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <span className="font-semibold">Notes:</span> {session.notes}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to={`/session/${session.appointmentId}`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          View Details
        </Link>

        {canJoin ? (
          <Link
            to={`/consultation/${session.appointmentId}?role=${role}`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Join Consultation
          </Link>
        ) : (
          <button
            disabled
            className="cursor-not-allowed rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-600"
          >
            Consultation not available yet
          </button>
        )}

        <a
          href={session.meetingLink}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Meeting Link
        </a>
      </div>
    </div>
  );
}