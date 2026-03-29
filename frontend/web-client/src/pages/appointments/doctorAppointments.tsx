import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getSessionsByDoctorId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";
import SessionCard from "../../components/appointments/DoctorSessionCard";

function getSessionDateTime(session: TelemedicineSession) {
  return new Date(`${session.scheduledDate}T${session.scheduledTime}`);
}

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export default function DoctorAppointmentsPage() {
  const auth = getStoredTelemedicineAuth();
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDoctorSessions() {
      if (!auth.userId) {
        setErrorMessage("No doctor login found.");
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage("");
        const data = await getSessionsByDoctorId(auth.userId);
        setSessions(Array.isArray(data) ? data : []);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load doctor appointments."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDoctorSessions();
  }, [auth.userId]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort(
      (a, b) => getSessionDateTime(a).getTime() - getSessionDateTime(b).getTime()
    );
  }, [sessions]);

  const today = new Date();

  const currentSessions = useMemo(() => {
    return sortedSessions.filter(
      (session) =>
        session.status === "active" ||
        session.status === "scheduled" ||
        isSameDay(getSessionDateTime(session), today)
    );
  }, [sortedSessions, today]);

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Doctor Appointments
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Manage your current appointments, review requests, and continue
                consultations from one place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/appointments/requests"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                View Appointment Requests
              </Link>

              <Link
                to="/session-history"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Completed Sessions
              </Link>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="mt-6 rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
            Loading doctor appointments...
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">
                Current Sessions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Active, scheduled, and today’s sessions are shown here.
              </p>
            </div>

            {currentSessions.length > 0 ? (
              <div className="space-y-4">
                {currentSessions.map((session) => (
                  <SessionCard
                    key={session._id}
                    session={session}
                    actionLabel={
                      session.status === "active"
                        ? "Join Consultation"
                        : "Open Waiting Room"
                    }
                    actionTo={
                      session.status === "active"
                        ? `/consultation/${session.appointmentId}`
                        : `/waiting-room/${session.appointmentId}`
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-sm text-slate-500">
                No current sessions found.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}