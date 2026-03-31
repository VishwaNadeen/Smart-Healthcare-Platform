import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelAppointment,
  createAppointment,
  deleteAppointment,
  getAppointmentSpecialties,
  getMyAppointments,
  searchDoctorsBySpecialty,
  type AppointmentDoctor,
  type AppointmentRecord,
} from "../../services/appointmentApi";
import {
  getSessionsByPatientId,
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

function AppointmentCard({
  appointment,
  onCancel,
  onDelete,
  actionLoadingId,
}: {
  appointment: AppointmentRecord;
  onCancel: (appointmentId: string) => Promise<void>;
  onDelete: (appointmentId: string) => Promise<void>;
  actionLoadingId: string | null;
}) {
  const isBusy = actionLoadingId === appointment._id;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">{appointment.specialization}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-800">
            {appointment.doctorName}
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
        {appointment.status !== "cancelled" && appointment.status !== "completed" && (
          <button
            type="button"
            onClick={() => void onCancel(appointment._id)}
            disabled={isBusy}
            className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
          >
            Cancel Appointment
          </button>
        )}
        <button
          type="button"
          onClick={() => void onDelete(appointment._id)}
          disabled={isBusy}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function PatientAppointmentsPage() {
  const auth = getStoredTelemedicineAuth();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<AppointmentDoctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [bookingForm, setBookingForm] = useState({
    specialization: "",
    doctorId: "",
    appointmentDate: "",
    appointmentTime: "",
    reason: "",
  });

  useEffect(() => {
    async function loadPageData() {
      if (!auth.userId || !auth.token) {
        setErrorMessage("No patient login found.");
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage("");
        const [sessionsData, appointmentsData, specialtiesData] = await Promise.all([
          getSessionsByPatientId(auth.userId),
          getMyAppointments(auth.token),
          getAppointmentSpecialties(),
        ]);
        setSessions(sessionsData);
        setAppointments(appointmentsData);
        setSpecialties(specialtiesData);
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

    void loadPageData();
  }, [auth.token, auth.userId]);

  useEffect(() => {
    async function loadDoctors() {
      if (!bookingForm.specialization) {
        setDoctors([]);
        return;
      }

      try {
        setLoadingDoctors(true);
        const data = await searchDoctorsBySpecialty(bookingForm.specialization);
        setDoctors(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load doctors.";
        setErrorMessage(message);
      } finally {
        setLoadingDoctors(false);
      }
    }

    void loadDoctors();
  }, [bookingForm.specialization]);

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

  const upcomingSessions = useMemo(() => {
    const now = new Date();

    return sortedSessions.filter((session) => {
      const sessionDate = getSessionDateTime(session);
      return (
        session.status !== "completed" &&
        session.status !== "cancelled" &&
        sessionDate >= now
      );
    });
  }, [sortedSessions]);

  const completedSessions = useMemo(
    () => sortedSessions.filter((session) => session.status === "completed"),
    [sortedSessions]
  );

  const activeSession = useMemo(
    () => sortedSessions.find((session) => session.status === "active") ?? null,
    [sortedSessions]
  );

  const upcomingAppointments = useMemo(
    () =>
      sortedAppointments.filter(
        (appointment) =>
          appointment.status === "pending" || appointment.status === "confirmed"
      ),
    [sortedAppointments]
  );

  const pastAppointments = useMemo(
    () =>
      sortedAppointments.filter(
        (appointment) =>
          appointment.status === "completed" || appointment.status === "cancelled"
      ),
    [sortedAppointments]
  );

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor._id === bookingForm.doctorId) ?? null,
    [doctors, bookingForm.doctorId]
  );

  const handleBookingChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setBookingForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "specialization" ? { doctorId: "" } : {}),
    }));
  };

  const reloadAppointments = async () => {
    if (!auth.token) return;
    const data = await getMyAppointments(auth.token);
    setAppointments(data);
  };

  const handleCreateAppointment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!auth.token || !auth.userId || !selectedDoctor) {
      setErrorMessage("Please select a doctor and ensure you are logged in.");
      return;
    }

    try {
      setSubmittingBooking(true);
      setErrorMessage("");

      const appointment = await createAppointment(auth.token, {
        patientId: auth.userId,
        doctorId: selectedDoctor._id,
        doctorName: selectedDoctor.fullName,
        specialization: bookingForm.specialization,
        appointmentDate: bookingForm.appointmentDate,
        appointmentTime: bookingForm.appointmentTime,
        reason: bookingForm.reason,
        paymentStatus: "pending",
      });

      setAppointments((prev) => [appointment, ...prev]);
      setBookingForm({
        specialization: "",
        doctorId: "",
        appointmentDate: "",
        appointmentTime: "",
        reason: "",
      });
      setDoctors([]);
      showToast("Appointment booked successfully.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create appointment.";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!auth.token) return;

    try {
      setActionLoadingId(appointmentId);
      const updated = await cancelAppointment(auth.token, appointmentId);
      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment._id === appointmentId ? updated : appointment
        )
      );
      showToast("Appointment cancelled successfully.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel appointment.";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!auth.token) return;

    try {
      setActionLoadingId(appointmentId);
      await deleteAppointment(auth.token, appointmentId);
      setAppointments((prev) =>
        prev.filter((appointment) => appointment._id !== appointmentId)
      );
      showToast("Appointment deleted successfully.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete appointment.";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
            Patient Appointments
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Book and manage appointments
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-blue-50 sm:text-base">
            Search doctors by specialty, create appointments through the
            appointment-service, and keep telemedicine session access in one place.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#book-appointment"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Book Appointment
            </a>
            <a
              href="#my-appointments"
              className="rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              My Appointments
            </a>
            <a
              href="#upcoming"
              className="rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Consultation Sessions
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Upcoming Appointments</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {upcomingAppointments.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Past Appointments</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {pastAppointments.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Upcoming Sessions</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {upcomingSessions.length}
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
            <div id="book-appointment" className="mt-10 rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Book an Appointment
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Choose a specialty first, then select a doctor returned by
                    appointment-service.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateAppointment} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Specialty
                    </label>
                    <select
                      name="specialization"
                      value={bookingForm.specialization}
                      onChange={handleBookingChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Select specialty</option>
                      {specialties.map((specialty) => (
                        <option key={specialty} value={specialty}>
                          {specialty}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Doctor
                    </label>
                    <select
                      name="doctorId"
                      value={bookingForm.doctorId}
                      onChange={handleBookingChange}
                      disabled={!bookingForm.specialization || loadingDoctors}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      <option value="">
                        {loadingDoctors
                          ? "Loading doctors..."
                          : doctors.length > 0
                          ? "Select doctor"
                          : "Choose specialty first"}
                      </option>
                      {doctors.map((doctor) => (
                        <option key={doctor._id} value={doctor._id}>
                          {doctor.fullName} - {doctor.city || "Unknown city"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedDoctor && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{selectedDoctor.fullName}</p>
                    <p className="mt-1">
                      {selectedDoctor.specialization}
                      {selectedDoctor.hospitalName
                        ? ` • ${selectedDoctor.hospitalName}`
                        : ""}
                      {selectedDoctor.city ? ` • ${selectedDoctor.city}` : ""}
                    </p>
                    <p className="mt-1">
                      Consultation Fee: {selectedDoctor.consultationFee ?? "Not listed"}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Appointment Date
                    </label>
                    <input
                      type="date"
                      name="appointmentDate"
                      value={bookingForm.appointmentDate}
                      onChange={handleBookingChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Appointment Time
                    </label>
                    <input
                      type="time"
                      name="appointmentTime"
                      value={bookingForm.appointmentTime}
                      onChange={handleBookingChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Reason
                  </label>
                  <textarea
                    name="reason"
                    value={bookingForm.reason}
                    onChange={handleBookingChange}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Describe the reason for the appointment"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingBooking}
                    className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
                  >
                    {submittingBooking ? "Booking..." : "Book Appointment"}
                  </button>
                </div>
              </form>
            </div>

            <div id="my-appointments" className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  My Appointment Bookings
                </h2>
              </div>

              <div className="grid gap-4">
                {sortedAppointments.length === 0 ? (
                  <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
                    No appointment bookings found.
                  </div>
                ) : (
                  sortedAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment._id}
                      appointment={appointment}
                      onCancel={handleCancelAppointment}
                      onDelete={handleDeleteAppointment}
                      actionLoadingId={actionLoadingId}
                    />
                  ))
                )}
              </div>
            </div>

            <div id="upcoming" className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">
                  Upcoming Consultation Sessions
                </h2>
              </div>

              <div className="grid gap-4">
                {upcomingSessions.length === 0 ? (
                  <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
                    No upcoming consultation sessions found.
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
