import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "../../components/telemedicine/StatusBadge";
import {
  getSessionByAppointmentId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";

export default function WaitingRoom() {
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
        console.error("Failed to load waiting room:", err);
        setError("Failed to load waiting room.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [appointmentId]);

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
                Your telemedicine consultation will begin soon.
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
              <Link
                to={`/consultation/${session.appointmentId}`}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Join Consultation
              </Link>

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