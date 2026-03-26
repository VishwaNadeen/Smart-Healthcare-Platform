import { useEffect, useState } from "react";
import SessionCard from "../../components/telemedicine/SessionCard";
import {
  getSessionsByDoctorId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";

export default function DoctorSessions() {
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const doctorId = "DOC001";

  useEffect(() => {
    async function loadSessions() {
      try {
        setLoading(true);
        setError("");

        const data = await getSessionsByDoctorId(doctorId);
        setSessions(data);
      } catch (error) {
        console.error("Failed to load doctor sessions:", error);
        setError("Failed to load doctor sessions.");
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [doctorId]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">
            Doctor Sessions
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            View all telemedicine sessions assigned to this doctor.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-sm">
            Loading doctor sessions...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-8 text-center text-red-600 shadow-sm">
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-sm">
            No doctor sessions found.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => (
              <SessionCard
                key={session._id}
                session={session}
                role="doctor"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}