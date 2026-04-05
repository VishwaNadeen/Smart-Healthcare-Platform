import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PatientAppointmentCard from "../../components/appointments/PatientAppointmentCard";
import PageLoading from "../../components/common/PageLoading";
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "completed" | "cancelled"
  >("all");

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
          error instanceof Error ? error.message : "Failed to load appointments."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadAppointments();
  }, [auth.token]);

  const visibleAppointments = useMemo(() => {
    return appointments
      .filter((appointment) =>
        statusFilter === "all" ? true : appointment.status === statusFilter
      )
      .sort((a, b) => {
        const aDate = new Date(
          `${a.appointmentDate}T${a.appointmentTime}`
        ).getTime();
        const bDate = new Date(
          `${b.appointmentDate}T${b.appointmentTime}`
        ).getTime();
        return aDate - bDate;
      });
  }, [appointments, statusFilter]);

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
                ...(response.appointment || {}),
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
        error instanceof Error ? error.message : "Failed to cancel appointment."
      );
    } finally {
      setCancellingId(null);
    }
  }

  if (isLoading) {
    return <PageLoading message="Loading appointments..." />;
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
              <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                Track all appointment requests here, including confirmed,
                completed, and rejected bookings.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/appointments/create"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                + Create Appointment
              </Link>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "all"
                      | "pending"
                      | "confirmed"
                      | "completed"
                      | "cancelled"
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500"
              >
                <option value="all">All Appointments</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Rejected / Cancelled</option>
              </select>
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

        {visibleAppointments.length === 0 ? (
          <div className="mt-16 flex min-h-[40vh] items-center justify-center px-6 text-center">
            <div className="max-w-md">
              <h3 className="text-xl font-bold text-slate-900">
                No appointments found
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                There are no appointments matching the selected status.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleAppointments.map((appointment) => (
              <PatientAppointmentCard
                key={appointment._id}
                appointment={appointment}
                onCancel={handleCancelAppointment}
                isCancelling={cancellingId === appointment._id}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
