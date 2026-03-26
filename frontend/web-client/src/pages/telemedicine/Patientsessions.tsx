import { useEffect, useState } from "react";
import SessionCard from "../../components/telemedicine/SessionCard";
import {
  getSessionsByPatientId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";

export default function PatientSessions() {
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const patientId = "PAT001";

  useEffect(() => {
    async function loadSessions() {
      try {
        setLoading(true);
        setError("");

        const data = await getSessionsByPatientId(patientId);
        setSessions(data);
      } catch (err) {
        console.error("Failed to load patient sessions:", err);
        setError("Failed to load patient sessions.");
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [patientId]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">
            Patient Sessions
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            View all telemedicine sessions assigned to this patient.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-sm">
            Loading patient sessions...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-8 text-center text-red-600 shadow-sm">
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-sm">
            No patient sessions found.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => (
              <SessionCard
                key={session._id}
                session={session}
                role="patient"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}