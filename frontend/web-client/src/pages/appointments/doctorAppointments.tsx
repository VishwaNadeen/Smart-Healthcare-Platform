import { useEffect, useMemo, useState } from "react";
import { PATIENT_API_URL } from "../../config/api";
import {
  getDoctorAppointments,
  updateDoctorAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../../services/appointmentApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

type PatientProfile = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-LK", {
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

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { message?: string; error?: string })
    | null;

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  if (data === null) {
    throw new Error("Empty response received from service");
  }

  return data as T;
}

export default function DoctorAppointmentsPage() {
  const auth = getStoredTelemedicineAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientsById, setPatientsById] = useState<Record<string, PatientProfile>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDoctorAppointments() {
      if (!auth.token || !auth.userId) {
        setErrorMessage("No doctor login found.");
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage("");
        const nextAppointments = await getDoctorAppointments(auth.token, auth.userId);
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
              const patientResponse = await fetch(`${PATIENT_API_URL}/${patientId}`);
              const patient = await parseResponse<PatientProfile>(patientResponse);
              return [patientId, patient] as const;
            } catch {
              return [patientId, null] as const;
            }
          })
        );

        setPatientsById(
          patientEntries.reduce<Record<string, PatientProfile>>((accumulator, entry) => {
            const [patientId, patient] = entry;

            if (patient) {
              accumulator[patientId] = patient;
            }

            return accumulator;
          }, {})
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
      setUpdatingId(appointmentId);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await updateDoctorAppointmentStatus(auth.token, appointmentId, status);

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

      setSuccessMessage(
        data.message ||
          (status === "confirmed"
            ? "Appointment request accepted successfully."
            : "Appointment request rejected successfully.")
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update appointment request."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function getPatientDisplayName(patientId: string) {
    const patient = patientsById[patientId];
    const fullName = `${patient?.firstName || ""} ${patient?.lastName || ""}`.trim();

    return fullName || `Patient ${patientId.slice(-6)}`;
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Appointment Requests
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                View only patient appointment requests here. Approved sessions will
                appear under the consultation tab.
              </p>
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
            Loading appointment requests...
          </div>
        ) : pendingAppointments.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-100">
            <div className="mx-auto max-w-md">
              <h3 className="text-xl font-bold text-slate-900">
                No pending requests
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                You do not have any pending appointment requests right now.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {pendingAppointments.map((appointment) => {
              const isUpdating = updatingId === appointment._id;

              return (
                <div
                  key={appointment._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-900">
                          {getPatientDisplayName(appointment.patientId)}
                        </h2>

                        <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          Pending
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-medium text-cyan-700">
                        {patientsById[appointment.patientId]?.email || appointment.patientId}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {appointment.reason?.trim() ||
                          "No reason provided for this appointment."}
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Patient ID
                          </p>
                          <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                            {appointment.patientId}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Date
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatDate(appointment.appointmentDate)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Time
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatTime(appointment.appointmentTime)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Contact
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {patientsById[appointment.patientId]?.phone || "Not available"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2 xl:col-span-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Appointment ID
                          </p>
                          <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                            {appointment._id}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 lg:w-56">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateAppointmentStatus(appointment._id, "confirmed")
                        }
                        disabled={isUpdating}
                        className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdating ? "Updating..." : "Accept Request"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateAppointmentStatus(appointment._id, "cancelled")
                        }
                        disabled={isUpdating}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdating ? "Updating..." : "Reject Request"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}