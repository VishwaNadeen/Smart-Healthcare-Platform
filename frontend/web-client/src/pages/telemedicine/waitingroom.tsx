import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import StatusBadge from "../../components/telemedicine/StatusBadge";
import {
  getSessionByAppointmentId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";
import {
  canAccessTelemedicineSession,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";

export default function WaitingRoom() {
  const { appointmentId } = useParams();
  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const auth = getStoredTelemedicineAuth();
  const role = auth.actorRole;
  const isDoctor = role === "doctor";

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
        console.error("Failed to load waiting room:", err);
        setError("Failed to load waiting room.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [appointmentId]);

  if (!auth.userId || !role) {
    return (
      <TelemedicineAccessNotice
        title="Waiting room needs login data"
        description="This page needs a valid login session with role and user id. Please sign in again."
        actionLabel="Go to Login"
      />
    );
  }

  if (!loading && session && !canAccessTelemedicineSession(auth, session)) {
    return (
      <TelemedicineAccessNotice
        title="Waiting room access denied"
        description="This appointment belongs to a different doctor or patient account."
        actionLabel={isDoctor ? "Doctor Sessions" : "Patient Sessions"}
        actionTo={isDoctor ? "/doctor-sessions" : "/patient-sessions"}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-center text-gray-600 shadow-sm">
            Loading waiting room...
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-red-50 p-8 text-center text-red-600 shadow-sm">
            {error}
          </div>
        ) : !session ? (
          <div className="rounded-3xl bg-white p-8 text-center text-gray-600 shadow-sm">
            Session not found.
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Waiting Room
              </h1>
              <p className="mt-2 text-gray-600">
                {isDoctor
                  ? "Review the session details and start the consultation when ready."
                  : session.status === "active"
                    ? "Your doctor is ready. You can join the consultation now."
                    : session.status === "completed"
                      ? "This consultation has already finished."
                      : "Your telemedicine consultation will begin soon."}
              </p>
            </div>

            <div className="mb-6 flex justify-center">
              <StatusBadge status={session.status} />
            </div>

            <div className="grid gap-4 rounded-2xl bg-slate-50 p-5 text-sm text-gray-700 sm:grid-cols-2">
              <p>
                <span className="font-semibold">Appointment ID:</span>{" "}
                {session.appointmentId}
              </p>
              <p>
                <span className="font-semibold">Room Name:</span>{" "}
                {session.roomName}
              </p>
              <p>
                <span className="font-semibold">Doctor ID:</span>{" "}
                {session.doctorId}
              </p>
              <p>
                <span className="font-semibold">Patient ID:</span>{" "}
                {session.patientId}
              </p>
              <p>
                <span className="font-semibold">Date:</span>{" "}
                {session.scheduledDate}
              </p>
              <p>
                <span className="font-semibold">Time:</span>{" "}
                {session.scheduledTime}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {session.status === "completed" ? (
                <Link
                  to={`/session-summary/${session.appointmentId}`}
                  className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  View Session Summary
                </Link>
              ) : session.status === "cancelled" ? null : (
                <Link
                  to={`/consultation/${session.appointmentId}`}
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  {isDoctor
                    ? "Open Consultation Room"
                    : session.status === "active"
                      ? "Join Consultation"
                      : "Stay Ready to Join"}
                </Link>
              )}

              <Link
                to={`/session/${session.appointmentId}`}
                className="rounded-lg bg-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
              >
                Back to Details
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
