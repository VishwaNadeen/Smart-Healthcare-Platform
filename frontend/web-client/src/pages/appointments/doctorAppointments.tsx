import { useEffect, useMemo, useState } from "react";
import DoctorAppointmentRequestCard from "../../components/appointments/AppointmentRequestCard";
import { useToast } from "../../components/common/ToastProvider";
import {
  getDoctorAppointments,
  updateDoctorAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../../services/appointmentApi";
import {
  getPatientSummaryByAuthUserId,
  type PatientSummaryResponse,
} from "../../services/patientApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

export default function DoctorAppointmentsPage() {
  const auth = getStoredTelemedicineAuth();
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientsById, setPatientsById] = useState<Record<string, PatientSummaryResponse>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDoctorAppointments() {
      if (!auth.token || !auth.userId) {
        setErrorMessage("No doctor login found.");
        setIsLoading(false);
        return;
      }

      try {
        const token = auth.token;

        setErrorMessage("");
        const nextAppointments = await getDoctorAppointments(token, auth.userId);
        setAppointments(Array.isArray(nextAppointments) ? nextAppointments : []);

        const patientIds = [
          ...new Set(
            (Array.isArray(nextAppointments) ? nextAppointments : []).map(
              (appointment) => appointment.patientId
            )
          ),
        ];

        if (patientIds.length === 0) {
          setPatientsById({});
          return;
        }

        const patientEntries = await Promise.all(
          patientIds.map(async (patientId) => {
            try {
              const patient = await getPatientSummaryByAuthUserId(token, patientId);
              return [patientId, patient] as const;
            } catch {
              return [patientId, null] as const;
            }
          })
        );

        setPatientsById(
          patientEntries.reduce<Record<string, PatientSummaryResponse>>((accumulator, entry) => {
            const [patientId, patient] = entry;

              if (patient) {
                accumulator[patientId] = patient;
              }

              return accumulator;
            },
            {}
          )
        );
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

    loadDoctorAppointments();
  }, [auth.token, auth.userId]);

  const pendingAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => appointment.status === "pending")
      .sort((a, b) => {
        const aDate = new Date(`${a.appointmentDate}T${a.appointmentTime}`).getTime();
        const bDate = new Date(`${b.appointmentDate}T${b.appointmentTime}`).getTime();
        return aDate - bDate;
      });
  }, [appointments]);

  async function handleUpdateAppointmentStatus(
    appointmentId: string,
    status: Extract<AppointmentStatus, "confirmed" | "cancelled">
  ) {
    if (!auth.token) {
      setErrorMessage("You must be logged in to manage appointment requests.");
      return;
    }

    try {
      setErrorMessage("");

      const data = await updateDoctorAppointmentStatus(
        auth.token,
        appointmentId,
        status
      );

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment._id === appointmentId
            ? {
                ...appointment,
                status: data.appointment?.status ?? status,
              }
            : appointment
        )
      );

      showToast(
        data.message ||
          (status === "confirmed"
            ? "Appointment request accepted successfully."
            : "Appointment request rejected successfully."),
        "success",
        3000
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update appointment request."
      );
    }
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex flex-col items-center">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Appointment Requests
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500 whitespace-nowrap sm:text-base">
                View only patient appointment requests here. Approved sessions will appear under the consultation tab.
              </p>
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
            Loading appointment requests...
          </div>
        ) : pendingAppointments.length === 0 ? (
          <div className="mt-16 flex min-h-[40vh] items-center justify-center px-6 text-center">
            <div className="max-w-md">
              <h3 className="text-xl font-bold text-slate-900">
                No pending requests
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                You do not have any pending appointment requests right now.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingAppointments.map((appointment) => {
              return (
                <DoctorAppointmentRequestCard
                  key={appointment._id}
                  appointment={appointment}
                  patient={patientsById[appointment.patientId]}
                  onAccept={() =>
                    handleUpdateAppointmentStatus(appointment._id, "confirmed")
                  }
                  onReject={() =>
                    handleUpdateAppointmentStatus(appointment._id, "cancelled")
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
