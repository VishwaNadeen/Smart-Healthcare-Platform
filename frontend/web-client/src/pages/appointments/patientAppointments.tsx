import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getSessionsByPatientId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

function getSessionDateTime(session: TelemedicineSession) {
  return new Date(`${session.scheduledDate}T${session.scheduledTime}`);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timeString: string) {
  const [hours = "00", minutes = "00"] = timeString.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionCard({
  session,
  actionLabel,
  actionTo,
}: {
  session: TelemedicineSession;
  actionLabel: string;
  actionTo: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Appointment ID: {session.appointmentId}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-800">
            Consultation Session
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(session.scheduledDate)} • {formatTime(session.scheduledTime)}
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
            session.status === "completed"
              ? "bg-green-100 text-green-700"
              : session.status === "active"
              ? "bg-blue-100 text-blue-700"
              : session.status === "cancelled"
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {session.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to={`/session/${session.appointmentId}`}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View Details
        </Link>

        <Link
          to={actionTo}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

export default function PatientAppointmentsPage() {
  const auth = getStoredTelemedicineAuth();
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPatientSessions() {
      if (!auth.userId) {
        setErrorMessage("No patient login found.");
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage("");
        const data = await getSessionsByPatientId(auth.userId);
        setSessions(data);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load patient appointments."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadPatientSessions();
  }, [auth.userId]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort(
      (a, b) => getSessionDateTime(a).getTime() - getSessionDateTime(b).getTime()
    );
  }, [sessions]);

  const upcomingSessions = useMemo(() => {
    const now = new Date();

    return sortedSessions.filter((session) => {
      const sessionDate = getSessionDateTime(session);
      return session.status !== "completed" && session.status !== "cancelled" && sessionDate >= now;
    });
  }, [sortedSessions]);

  const completedSessions = useMemo(() => {
    return sortedSessions.filter((session) => session.status === "completed");
  }, [sortedSessions]);

  const activeSession = useMemo(() => {
    return sortedSessions.find((session) => session.status === "active") ?? null;
  }, [sortedSessions]);

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
            Patient Appointments
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Manage your consultations
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-blue-50 sm:text-base">
            View upcoming appointments, access your active consultation, and check
            completed session history from one page.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#upcoming"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Upcoming Appointments
            </a>
            <a
              href="#history"
              className="rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Completed History
            </a>
            <Link
              to="/patient-sessions"
              className="rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Open Patient Sessions
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Upcoming</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {upcomingSessions.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {completedSessions.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active Session</p>
            <p className="mt-2 text-lg font-bold text-slate-800">
              {activeSession ? activeSession.appointmentId : "No active session"}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="mt-6 rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading patient appointments...
          </div>
        ) : (
          <>
            <div id="upcoming" className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  Upcoming Appointments
                </h2>
              </div>

              <div className="grid gap-4">
                {upcomingSessions.length === 0 ? (
                  <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
                    No upcoming appointments found.
                  </div>
                ) : (
                  upcomingSessions.map((session) => (
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
                  ))
                )}
              </div>
            </div>

            <div id="history" className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  Completed Session History
                </h2>
              </div>

              <div className="grid gap-4">
                {completedSessions.length === 0 ? (
                  <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
                    No completed sessions found.
                  </div>
                ) : (
                  completedSessions.map((session) => (
                    <SessionCard
                      key={session._id}
                      session={session}
                      actionLabel="Open Summary"
                      actionTo={`/session-summary/${session.appointmentId}`}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}