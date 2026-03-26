import { useEffect, useState } from "react";
import { getSessionsByPatientId } from "../../services/telemedicineApi";
import type { TelemedicineSession } from "../../services/telemedicineApi";

export default function SessionHistory() {
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const patientId = "PAT001";

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await getSessionsByPatientId(patientId);
        setSessions(data);
      } catch (error) {
        console.error("Failed to load session history:", error);
      }
    }

    loadHistory();
  }, []);

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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}