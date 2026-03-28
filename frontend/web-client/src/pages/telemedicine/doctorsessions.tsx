import { useEffect, useState } from "react";
import SessionCard from "../../components/telemedicine/SessionCard";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import {
  getSessionsByDoctorId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

export default function DoctorSessions() {
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const auth = getStoredTelemedicineAuth();

  const doctorId = auth.userId;

  useEffect(() => {
    async function loadSessions() {
      if (!doctorId) {
        setError("Doctor ID not found in stored login data.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getSessionsByDoctorId(doctorId);
        setSessions(data);
      } catch (error: unknown) {
        console.error("Failed to load doctor sessions:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load doctor sessions."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [doctorId]);

  if (!doctorId) {
    return (
      <TelemedicineAccessNotice
        title="Doctor session access needs a user id"
        description="Your login session is missing the doctor id returned by the backend. Please sign in again."
        actionLabel="Go to Login"
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">
            Doctor Sessions
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            View all telemedicine sessions assigned to doctor {doctorId}.
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
