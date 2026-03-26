import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getSessionByAppointmentId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";

export default function SessionSummary() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
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
        console.error("Failed to load session summary:", err);
        setError("Failed to load session summary.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center text-gray-600 shadow-sm">
          Loading summary...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-red-50 p-8 text-center text-red-600 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center text-gray-600 shadow-sm">
          Session not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
            ✓
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            Consultation Completed
          </h1>

          <p className="mt-2 text-gray-600">
            Session summary for appointment {session.appointmentId}
          </p>
        </div>

        <div className="grid gap-4 rounded-2xl bg-slate-50 p-5 text-sm text-gray-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold">Appointment ID:</span>{" "}
            {session.appointmentId}
          </p>

          <p>
            <span className="font-semibold">Status:</span> {session.status}
          </p>

          <p>
            <span className="font-semibold">Doctor ID:</span> {session.doctorId}
          </p>

          <p>
            <span className="font-semibold">Patient ID:</span> {session.patientId}
          </p>

          <p>
            <span className="font-semibold">Room Name:</span> {session.roomName}
          </p>

          <p>
            <span className="font-semibold">Date:</span> {session.scheduledDate}
          </p>

          <p>
            <span className="font-semibold">Time:</span> {session.scheduledTime}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-slate-50 p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Doctor Notes
          </h2>

          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {session.notes?.trim() || "No notes available."}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/doctor-sessions"
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Doctor Sessions
          </Link>

          <Link
            to="/patient-sessions"
            className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Patient Sessions
          </Link>
        </div>
      </div>
    </div>
  );
}