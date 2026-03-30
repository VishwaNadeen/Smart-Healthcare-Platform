import { useEffect, useMemo, useState } from "react";
import DoctorSessionCard from "../../components/telemedicine/DoctorSessionCard";
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

  const doctorId = auth.doctorProfileId || auth.userId;

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
        setSessions(Array.isArray(data) ? data : []);
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
              <DoctorSessionCard key={session._id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}