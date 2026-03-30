import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PatientAppointmentCard from "../../components/appointments/PatientAppointmentCard";
import {
  cancelAppointment,
  getPatientAppointments,
  type Appointment,
} from "../../services/appointmentApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

export default function PatientAppointmentsPage() {
  const auth = getStoredTelemedicineAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadAppointments() {
      if (!auth.token) {
        setErrorMessage("No patient login found.");
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage("");
        const data = await getPatientAppointments(auth.token);
        setAppointments(Array.isArray(data) ? data : []);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load appointments."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadAppointments();
  }, [auth.token]);

  const pendingAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => appointment.status === "pending")
      .sort((a, b) => {
        const aDate = new Date(
          `${a.appointmentDate}T${a.appointmentTime}`
        ).getTime();
        const bDate = new Date(
          `${b.appointmentDate}T${b.appointmentTime}`
        ).getTime();
        return aDate - bDate;
      });
  }, [appointments]);

  async function handleCancelAppointment(appointmentId: string) {
    if (!auth.token) {
      setErrorMessage("You must be logged in to cancel an appointment.");
      return;
    }

    try {
      setCancellingId(appointmentId);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await cancelAppointment(auth.token, appointmentId);

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment._id === appointmentId
            ? {
                ...appointment,
                status: "cancelled",
              }
            : appointment
        )
      );

      setSuccessMessage(
        response.message || "Appointment cancelled successfully."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to cancel appointment."
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                My Appointments
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/appointments/create"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                + Create Appointment
              </Link>

              <Link
                to="/appointments/history"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelled & Completed
              </Link>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <div className="mt-6 rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
            Loading appointments...
          </div>
        ) : pendingAppointments.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-100">
            <div className="mx-auto max-w-md">
              <h3 className="text-xl font-bold text-slate-900">
                No pending appointments found
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                You do not have any pending appointment requests right now.
              </p>
              <Link
                to="/appointments/create"
                className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Create Appointment
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">
                Pending Appointments
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Requests waiting for doctor approval.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {pendingAppointments.map((appointment) => (
                <PatientAppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                  onCancel={handleCancelAppointment}
                  isCancelling={cancellingId === appointment._id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}