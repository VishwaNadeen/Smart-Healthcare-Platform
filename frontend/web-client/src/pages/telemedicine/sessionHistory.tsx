import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import { getSessionsByPatientId } from "../../services/telemedicineApi";
import type { TelemedicineSession } from "../../services/telemedicineApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

export default function SessionHistory() {
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const auth = getStoredTelemedicineAuth();
  const patientId = auth.userId;

  useEffect(() => {
    async function loadHistory() {
      if (!patientId) {
        return;
      }

      try {
        const data = await getSessionsByPatientId(patientId);
        setSessions(
          data.filter((session) =>
            ["completed", "cancelled"].includes(session.status)
          )
        );
      } catch (error) {
        console.error("Failed to load session history:", error);
      }
    }

    loadHistory();
  }, [patientId]);

  if (!patientId) {
    return (
      <TelemedicineAccessNotice
        title="Patient history needs a user id"
        description="This page could not determine which patient is signed in. Please sign in again."
        actionLabel="Go to Login"
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-bold text-slate-800">
          Session History
        </h1>

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="rounded-xl bg-white p-6 shadow">
              <p className="text-slate-600">No session history found.</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session._id}
                className="rounded-2xl bg-white p-5 shadow border border-slate-200"
              >
                <h2 className="text-lg font-bold text-slate-800 mb-2">
                  Appointment: {session.appointmentId}
                </h2>
                <p className="text-slate-600">
                  Doctor ID: {session.doctorId}
                </p>
                <p className="text-slate-600">
                  Date: {session.scheduledDate}
                </p>
                <p className="text-slate-600">
                  Time: {session.scheduledTime}
                </p>
                <p className="text-slate-600">
                  Status: {session.status}
                </p>
                <p className="text-slate-600 mt-2">
                  Notes: {session.notes || "No notes available"}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to={`/session/${session.appointmentId}`}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/session-summary/${session.appointmentId}`}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                  >
                    View Summary
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
