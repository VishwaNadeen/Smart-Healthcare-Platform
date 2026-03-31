import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDoctorAppointments,
  updateAppointmentStatus,
  type AppointmentRecord,
} from "../../services/appointmentApi";
import {
  getSessionsByDoctorId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";
import { useToast } from "../../components/common/ToastProvider";

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

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
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
            Doctor Consultation Slot
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

function DoctorAppointmentCard({
  appointment,
  onStatusChange,
  loadingId,
}: {
  appointment: AppointmentRecord;
  onStatusChange: (
    appointmentId: string,
    status: "confirmed" | "completed" | "cancelled",
    note: string
  ) => Promise<void>;
  loadingId: string | null;
}) {
  const isBusy = loadingId === appointment._id;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">{appointment.specialization}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-800">
            Appointment #{appointment._id}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {formatDate(appointment.appointmentDate)} •{" "}
            {formatTime(appointment.appointmentTime)}
          </p>
          {appointment.reason && (
            <p className="mt-2 text-sm leading-6 text-slate-600">{appointment.reason}</p>
          )}
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${
            appointment.status === "completed"
              ? "bg-green-100 text-green-700"
              : appointment.status === "confirmed"
              ? "bg-blue-100 text-blue-700"
              : appointment.status === "cancelled"
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {appointment.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {appointment.status === "pending" && (
          <>
            <button
              type="button"
              onClick={() =>
                void onStatusChange(
                  appointment._id,
                  "confirmed",
                  "Appointment accepted by doctor"
                )
              }
              disabled={isBusy}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() =>
                void onStatusChange(
                  appointment._id,
                  "cancelled",
                  "Appointment declined by doctor"
                )
              }
              disabled={isBusy}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              Reject
            </button>
          </>
        )}

        {appointment.status === "confirmed" && (
          <>
            <button
              type="button"
              onClick={() =>
                void onStatusChange(
                  appointment._id,
                  "completed",
                  "Consultation finished"
                )
              }
              disabled={isBusy}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              Mark Completed
            </button>
            <button
              type="button"
              onClick={() =>
                void onStatusChange(
                  appointment._id,
                  "cancelled",
                  "Doctor unavailable"
                )
              }
              disabled={isBusy}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function DoctorAppointmentsPage() {
  const auth = getStoredTelemedicineAuth();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDoctorData() {
      if (!auth.userId || !auth.token) {
        setErrorMessage("No doctor login found.");
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage("");
        const [sessionsData, appointmentsData] = await Promise.all([
          getSessionsByDoctorId(auth.userId),
          getDoctorAppointments(auth.token, auth.userId),
        ]);
        setSessions(sessionsData);
        setAppointments(appointmentsData);
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

    void loadDoctorData();
  }, [auth.token, auth.userId]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort(
      (a, b) => getSessionDateTime(a).getTime() - getSessionDateTime(b).getTime()
    );
  }, [sessions]);

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort((a, b) => {
        const first = new Date(`${a.appointmentDate}T${a.appointmentTime}`).getTime();
        const second = new Date(`${b.appointmentDate}T${b.appointmentTime}`).getTime();
        return first - second;
      }),
    [appointments]
  );

  const today = new Date();

  const todaySessions = useMemo(
    () =>
      sortedSessions.filter((session) =>
        isSameDay(getSessionDateTime(session), today)
      ),
    [sortedSessions]
  );

  const activeSessions = useMemo(
    () => sortedSessions.filter((session) => session.status === "active"),
    [sortedSessions]
  );

  const completedSessions = useMemo(
    () => sortedSessions.filter((session) => session.status === "completed"),
    [sortedSessions]
  );

  const pendingAppointments = useMemo(
    () => sortedAppointments.filter((appointment) => appointment.status === "pending"),
    [sortedAppointments]
  );

  const confirmedAppointments = useMemo(
    () =>
      sortedAppointments.filter((appointment) => appointment.status === "confirmed"),
    [sortedAppointments]
  );

  const completedAppointments = useMemo(
    () =>
      sortedAppointments.filter((appointment) => appointment.status === "completed"),
    [sortedAppointments]
  );

  const handleAppointmentStatusChange = async (
    appointmentId: string,
    status: "confirmed" | "completed" | "cancelled",
    note: string
  ) => {
    if (!auth.token) return;

    try {
      setActionLoadingId(appointmentId);
      const updated = await updateAppointmentStatus(
        auth.token,
        appointmentId,
        status,
        note
      );
      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment._id === appointmentId ? updated : appointment
        )
      );
      showToast("Appointment status updated successfully.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update appointment.";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-800 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
            Doctor Appointments
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Manage bookings and daily sessions
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-blue-50 sm:text-base">
            Review patient booking requests from appointment-service and keep the
            telemedicine session workflow close by.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#appointment-requests"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Appointment Requests
            </a>
            <a
              href="#confirmed-appointments"
              className="rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Confirmed Appointments
            </a>
            <a
              href="#today-sessions"
              className="rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Consultation Sessions
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending Requests</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {pendingAppointments.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Confirmed</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {confirmedAppointments.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Today Sessions</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {todaySessions.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Completed Appointments</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {completedAppointments.length}
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
            Loading doctor appointments...
          </div>
        ) : (
          <>
            <div id="appointment-requests" className="mt-10">
              <h2 className="mb-4 text-2xl font-bold text-slate-800">
                Appointment Requests
              </h2>

              <div className="grid gap-4">
                {pendingAppointments.length === 0 ? (
                  <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
                    No pending appointment requests.
                  </div>
                ) : (
                  pendingAppointments.map((appointment) => (
                    <DoctorAppointmentCard
                      key={appointment._id}
                      appointment={appointment}
                      onStatusChange={handleAppointmentStatusChange}
                      loadingId={actionLoadingId}
                    />
                  ))
                )}
              </div>
            </div>

            <div id="confirmed-appointments" className="mt-10">
              <h2 className="mb-4 text-2xl font-bold text-slate-800">
                Confirmed Appointments
              </h2>

              <div className="grid gap-4">
                {confirmedAppointments.length === 0 ? (
                  <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
                    No confirmed appointments.
                  </div>
                ) : (
                  confirmedAppointments.map((appointment) => (
                    <DoctorAppointmentCard
                      key={appointment._id}
                      appointment={appointment}
                      onStatusChange={handleAppointmentStatusChange}
                      loadingId={actionLoadingId}
                    />
                  ))
                )}
              </div>
            </div>

            <div id="today-sessions" className="mt-10">
              <h2 className="mb-4 text-2xl font-bold text-slate-800">
                Today Sessions
              </h2>

              <div className="grid gap-4">
                {todaySessions.length === 0 ? (
                  <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
                    No sessions scheduled for today.
                  </div>
                ) : (
                  todaySessions.map((session) => (
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

            <div id="completed-history" className="mt-10">
              <h2 className="mb-4 text-2xl font-bold text-slate-800">
                Completed Sessions History
              </h2>

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
