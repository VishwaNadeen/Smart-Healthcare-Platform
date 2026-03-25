import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  getSessionByAppointmentId,
  type TelemedicineSession,
  updateSessionStatus,
} from "../../services/telemedicineApi";

export default function SessionDetails() {
  const { appointmentId } = useParams();
  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSession() {
      if (!appointmentId) {
        setError("Appointment ID not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const data = await getSessionByAppointmentId(appointmentId);
        setSession(data);
      } catch (err) {
        console.error("Failed to load session details:", err);
        setError("Failed to load session details.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [appointmentId]);

  async function handleStartSession() {
    if (!session) return;

    try {
      await updateSessionStatus(session._id, "active");
      alert("Session started");
      window.location.reload();
    } catch (err) {
      console.error("Failed to start session:", err);
      alert("Failed to start session");
    }
  }

  async function handleCancelSession() {
    if (!session) return;

    try {
      await updateSessionStatus(session._id, "cancelled");
      alert("Session cancelled");
      window.location.reload();
    } catch (err) {
      console.error("Failed to cancel session:", err);
      alert("Failed to cancel session");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-sm">
            Loading session details...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-8 text-center text-red-600 shadow-sm">
            {error}
          </div>
        ) : !session ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-sm">
            Session not found.
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Session Details
                </h1>
                <p className="mt-2 text-gray-600">
                  Appointment ID: {session.appointmentId}
                </p>
              </div>

              <StatusBadge status={session.status} />
            </div>

            <div className="grid gap-4 rounded-2xl bg-slate-50 p-5 text-sm text-gray-700 sm:grid-cols-2">
              <p>
                <span className="font-semibold">Doctor ID:</span>{" "}
                {session.doctorId}
              </p>
              <p>
                <span className="font-semibold">Patient ID:</span>{" "}
                {session.patientId}
              </p>
              <p>
                <span className="font-semibold">Room Name:</span>{" "}
                {session.roomName}
              </p>
              <p>
                <span className="font-semibold">Date:</span>{" "}
                {session.scheduledDate}
              </p>
              <p>
                <span className="font-semibold">Time:</span>{" "}
                {session.scheduledTime}
              </p>
              <p>
                <span className="font-semibold">Meeting Link:</span>{" "}
                <a
                  href={session.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Open Meeting
                </a>
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 p-5">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">
                Notes
              </h2>
              <p className="text-sm text-gray-600">
                {session.notes?.trim()
                  ? session.notes
                  : "No notes added for this session yet."}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`/waiting-room/${session.appointmentId}`}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Go to Waiting Room
              </Link>

              <Link
                to={`/consultation/${session.appointmentId}`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Open Consultation
              </Link>

              <button
                onClick={handleStartSession}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
              >
                Start Session
              </button>

              <button
                onClick={handleCancelSession}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Cancel Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
