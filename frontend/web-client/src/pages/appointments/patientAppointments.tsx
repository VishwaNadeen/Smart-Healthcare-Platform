import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDoctorById } from "../../services/doctorApi";
import PatientAppointmentCard from "../../components/appointments/PatientAppointmentCard";
import PageLoading from "../../components/common/PageLoading";
import NoPendingAppointments from "./noPatAppointments";
import {
  cancelAppointment,
  getPatientAppointments,
  respondToReschedule,
  type Appointment,
} from "../../services/appointmentApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

export default function PatientAppointmentsPage() {
  const auth = getStoredTelemedicineAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [completingPaymentId, setCompletingPaymentId] = useState<string | null>(null);
  const [respondingRescheduleId, setRespondingRescheduleId] = useState<string | null>(null);

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

    loadAppointments();
  }, [auth.token]);

  const visibleAppointments = useMemo(() => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

    return appointments
      .filter((a) => {
        if (a.status === "cancelled") return false;
        if (a.status === "confirmed") return false;
        if (a.status === "completed") return false;
        // paid + still pending doctor review — show
        if (a.paymentStatus === "paid" && a.status === "pending") return true;
        // unpaid pending — show only within 30 min payment window
        if (
          a.status === "pending" &&
          a.paymentStatus === "pending" &&
          a.createdAt &&
          new Date(a.createdAt) >= thirtyMinAgo
        ) return true;
        return false;
      })
      .sort((a, b) => {
        const aDate = new Date(`${a.appointmentDate}T${a.appointmentTime}`).getTime();
        const bDate = new Date(`${b.appointmentDate}T${b.appointmentTime}`).getTime();
        return aDate - bDate;
      });
  }, [appointments]);

  async function handleCompletePayment(appointment: Appointment) {
    try {
      setCompletingPaymentId(appointment._id);
      const doctor = await getDoctorById(appointment.doctorId);

      if (!doctor.consultationFee) {
        setErrorMessage("This doctor has no consultation fee set. Please contact support.");
        return;
      }

      navigate("/payment/checkout", {
        state: {
          appointmentId: appointment._id,
          doctorId: appointment.doctorId,
          doctorName: appointment.doctorName,
          specialization: appointment.specialization,
          amount: doctor.consultationFee,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
        },
      });
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load payment details."
      );
    } finally {
      setCompletingPaymentId(null);
    }
  }

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

      setAppointments((current) =>
        current.map((a) =>
          a._id === appointmentId ? { ...a, status: "cancelled" } : a
        )
      );

      setSuccessMessage(response.message || "Appointment cancelled successfully.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to cancel appointment."
      );
    } finally {
      setCancellingId(null);
    }
  }

  async function handleRescheduleResponse(
    appointmentId: string,
    response: "approved" | "rejected"
  ) {
    if (!auth.token) {
      setErrorMessage("You must be logged in.");
      return;
    }

    try {
      setRespondingRescheduleId(appointmentId);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await respondToReschedule(auth.token, appointmentId, response);

      setAppointments((current) =>
        current.map((a) =>
          a._id === appointmentId
            ? {
                ...a,
                rescheduleStatus: response,
                ...(response === "approved" && {
                  appointmentDate: a.rescheduledDate ?? a.appointmentDate,
                  appointmentTime: a.rescheduledTime ?? a.appointmentTime,
                  status: "confirmed" as const,
                }),
              }
            : a
        )
      );

      setSuccessMessage(
        data.message ||
          (response === "approved"
            ? "Reschedule approved — appointment confirmed."
            : "Reschedule rejected — admin will process your refund.")
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to respond to reschedule."
      );
    } finally {
      setRespondingRescheduleId(null);
    }
  }

  if (isLoading) {
    return <PageLoading message="Loading appointments..." />;
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
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
          <NoPendingAppointments />
        ) : (
          <>
            <div className="mb-8 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
              <div className="h-1 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-200" />
              <div className="relative px-6 py-8 sm:px-8 sm:py-10">
                <div className="text-center">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                      My Appointments
                    </h1>
                    <p className="mt-3 text-sm text-slate-600">
                      Manage your pending bookings and continue with the next step.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-center sm:absolute sm:bottom-6 sm:right-6 sm:mt-0">
                  <Link
                    to="/appointments/create"
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    + Create Appointment
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleAppointments.map((appointment) => (
                <PatientAppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                  onCancel={handleCancelAppointment}
                  isCancelling={cancellingId === appointment._id}
                  onCompletePayment={handleCompletePayment}
                  isCompletingPayment={completingPaymentId === appointment._id}
                  onRescheduleResponse={handleRescheduleResponse}
                  isRespondingToReschedule={respondingRescheduleId === appointment._id}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
