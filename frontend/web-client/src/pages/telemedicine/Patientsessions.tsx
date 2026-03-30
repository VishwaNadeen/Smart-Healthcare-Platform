import { useEffect, useMemo, useState } from "react";
import PatientSessionCard from "../../components/telemedicine/PatientSessionCard";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import {
  getSessionsByPatientId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

export default function PatientSessions() {
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const auth = getStoredTelemedicineAuth();

  const patientId = auth.userId;

  useEffect(() => {
    async function loadSessions() {
      if (!patientId) {
        setError("Patient ID not found in stored login data.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getSessionsByPatientId(patientId);
        setSessions(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        console.error("Failed to load patient sessions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load patient sessions."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [patientId]);

  const approvedSessions = useMemo(() => {
    return sessions
      .filter(
        (session) => session.status === "scheduled" || session.status === "active"
      )
      .sort((a, b) => {
        const aDate = new Date(`${a.scheduledDate}T${a.scheduledTime}`).getTime();
        const bDate = new Date(`${b.scheduledDate}T${b.scheduledTime}`).getTime();
        return aDate - bDate;
      });
  }, [sessions]);

  if (!patientId) {
    return (
      <TelemedicineAccessNotice
        title="Patient session access needs a user id"
        description="Your login session is missing the patient id returned by the backend. Please sign in again."
        actionLabel="Go to Login"
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">
            Approved Sessions
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Only approved consultation sessions are shown here.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-sm">
            Loading approved sessions...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-8 text-center text-red-600 shadow-sm">
            {error}
          </div>
        ) : approvedSessions.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-sm">
            No approved sessions found.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {approvedSessions.map((session) => (
              <PatientSessionCard key={session._id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}