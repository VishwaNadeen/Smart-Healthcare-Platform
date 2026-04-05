import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLoading from "../../components/common/PageLoading";
import PrescriptionCard from "../../components/prescriptions/PrescriptionCard";
import {
  getDoctorAppointments,
  getPatientAppointments,
  type Appointment,
} from "../../services/appointmentApi";
import {
  getPrescriptionsByAppointmentId,
  type TelemedicinePrescription,
} from "../../services/telemedicineApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

type PrescriptionGroup = {
  appointment: Appointment;
  prescriptions: TelemedicinePrescription[];
};

function getAppointmentTimestamp(appointment: Appointment) {
  return new Date(
    `${appointment.appointmentDate || ""}T${appointment.appointmentTime || "00:00"}`
  ).getTime();
}

function getGroupTimestamp(group: PrescriptionGroup) {
  const firstPrescriptionDate = group.prescriptions[0]?.createdAt;

  if (firstPrescriptionDate) {
    const time = new Date(firstPrescriptionDate).getTime();

    if (!Number.isNaN(time)) {
      return time;
    }
  }

  return getAppointmentTimestamp(group.appointment);
}

async function getAccessibleAppointments() {
  const auth = getStoredTelemedicineAuth();

  if (!auth.isAuthenticated || !auth.token) {
    throw new Error("You must be logged in to view prescriptions.");
  }

  if (auth.role === "patient") {
    return getPatientAppointments(auth.token);
  }

  if (auth.role === "doctor") {
    const doctorId = auth.doctorProfileId || auth.userId;

    if (!doctorId) {
      throw new Error("Doctor profile was not found for the logged-in user.");
    }

    return getDoctorAppointments(auth.token, doctorId);
  }

  throw new Error("Only patients and doctors can view prescriptions.");
}

async function getSafePrescriptionsForAppointment(appointmentId: string) {
  try {
    const response = await getPrescriptionsByAppointmentId(appointmentId);
    return response.data || [];
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("404") ||
        error.message.toLowerCase().includes("session not found"))
    ) {
      return [];
    }

    throw error;
  }
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-sm ring-1 ring-rose-100">
      <h2 className="text-lg font-semibold text-rose-700">Failed to load prescriptions</h2>
      <p className="mt-2 text-sm leading-6 text-rose-600">{message}</p>
    </div>
  );
}

function EmptyState({
  appointmentsPath,
  isSingleAppointment,
}: {
  appointmentsPath: string;
  isSingleAppointment: boolean;
}) {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700 ring-1 ring-blue-100">
        Rx
      </div>
      <h2 className="mt-5 text-xl font-bold text-slate-900">No prescriptions found</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {isSingleAppointment
          ? "There are no saved prescriptions for this appointment yet."
          : "There are no saved prescriptions linked to this account's appointments yet."}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to={appointmentsPath}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Back to Appointments
        </Link>

        {isSingleAppointment && (
          <Link
            to="/prescriptions"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View All Prescriptions
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PrescriptionsPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const auth = getStoredTelemedicineAuth();
  const isSingleAppointment = Boolean(appointmentId);
  const appointmentsPath =
    auth.role === "doctor" ? "/appointments/doctor" : "/appointments/patient";

  const [groups, setGroups] = useState<PrescriptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const appointments = (await getAccessibleAppointments())
          .slice()
          .sort((a, b) => getAppointmentTimestamp(b) - getAppointmentTimestamp(a));

        if (!isActive) {
          return;
        }

        if (appointmentId) {
          const appointment = appointments.find((item) => item._id === appointmentId);

          if (!appointment) {
            throw new Error("Appointment not found for the logged-in user.");
          }

          const prescriptions = await getSafePrescriptionsForAppointment(appointmentId);

          if (!isActive) {
            return;
          }

          setGroups([{ appointment, prescriptions }]);
          return;
        }

        const nextGroups = await Promise.all(
          appointments.map(async (appointment) => ({
            appointment,
            prescriptions: await getSafePrescriptionsForAppointment(appointment._id),
          }))
        );

        if (!isActive) {
          return;
        }

        setGroups(
          nextGroups
            .filter((group) => group.prescriptions.length > 0)
            .sort((a, b) => getGroupTimestamp(b) - getGroupTimestamp(a))
        );
      } catch (err) {
        if (!isActive) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading prescriptions."
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isActive = false;
    };
  }, [appointmentId]);

  const singleAppointmentGroup = isSingleAppointment ? groups[0] : null;

  if (loading) {
    return <PageLoading message="Loading prescriptions..." />;
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 p-5 shadow-sm ring-1 ring-blue-300 sm:p-6">
          <div className="flex flex-col items-center gap-5 text-center">
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                {isSingleAppointment ? "Appointment Prescriptions" : "My Prescriptions"}
              </h1>

              {!error && (
                <p className="mt-3 text-sm text-blue-100">
                  {isSingleAppointment
                    ? "Prescription records for the selected appointment are listed below."
                    : `Prescription records from ${groups.length} appointment${
                        groups.length === 1 ? "" : "s"
                      } are listed below.`}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {isSingleAppointment && (
                <Link
                  to="/prescriptions"
                  className="inline-flex items-center justify-center rounded-xl border border-blue-200/60 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  View All Prescriptions
                </Link>
              )}
            </div>
          </div>

        </div>

        <div className="mt-6">
          {error ? (
            <ErrorState message={error} />
          ) : isSingleAppointment && singleAppointmentGroup ? (
            <PrescriptionCard
              appointment={singleAppointmentGroup.appointment}
              defaultOpen={true}
              currentUsername={auth.username || ""}
              prescriptions={singleAppointmentGroup.prescriptions}
            />
          ) : isSingleAppointment && !singleAppointmentGroup ? (
            <EmptyState appointmentsPath={appointmentsPath} isSingleAppointment={true} />
          ) : groups.length === 0 ? (
            <EmptyState appointmentsPath={appointmentsPath} isSingleAppointment={false} />
          ) : (
            <div className="space-y-6">
              {groups.map((group, index) => (
                <PrescriptionCard
                  key={group.appointment._id}
                  appointment={group.appointment}
                  defaultOpen={index === 0}
                  currentUsername={auth.username || ""}
                  prescriptions={group.prescriptions}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
