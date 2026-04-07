import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getAppointmentById,
  getAppointmentTracking,
  type Appointment,
  type AppointmentStatus,
  type AppointmentStatusHistoryItem,
} from "../../services/appointmentApi";
import { downloadAppointmentReceiptPdf } from "../../utils/appointmentReceiptPdf";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "long",
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

function formatDateTime(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getStatusBadgeClasses(status: AppointmentStatus) {
  switch (status) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "completed":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getStatusLabel(status: AppointmentStatus, latestCancelledReason: string) {
  if (status === "cancelled" && latestCancelledReason) {
    return "Rejected";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getLatestCancelledReason(statusHistory: AppointmentStatusHistoryItem[]) {
  const latestCancelledEntry = [...statusHistory]
    .reverse()
    .find((entry) => entry.status === "cancelled" && entry.note?.trim());

  if (!latestCancelledEntry?.note?.trim()) {
    return "";
  }

  if (latestCancelledEntry.note.trim().toLowerCase() === "appointment cancelled") {
    return "";
  }

  return latestCancelledEntry.note.trim();
}

export default function PatientAppointmentDetailsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const auth = getStoredTelemedicineAuth();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadAppointmentDetails() {
      if (!auth.token) {
        setErrorMessage("No patient login found.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const [appointmentData, trackingData] = await Promise.all([
          getAppointmentById(auth.token, id),
          getAppointmentTracking(auth.token, id),
        ]);

        setAppointment({
          ...appointmentData,
          statusHistory: trackingData.statusHistory || appointmentData.statusHistory || [],
          paymentStatus: trackingData.paymentStatus || appointmentData.paymentStatus,
          status: trackingData.status || appointmentData.status,
          updatedAt: trackingData.updatedAt || appointmentData.updatedAt,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load appointment details.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadAppointmentDetails();
  }, [auth.token, id]);

  const statusHistory = appointment?.statusHistory || [];
  const latestCancelledReason = useMemo(
    () => getLatestCancelledReason(statusHistory),
    [statusHistory]
  );

  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_26%,#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                Appointment Details
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Review your booking details, current status, and any doctor updates
                for this appointment.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              {appointment ? (
                <button
                  type="button"
                  onClick={() =>
                    downloadAppointmentReceiptPdf(appointment, latestCancelledReason)
                  }
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Download Receipt PDF
                </button>
              ) : null}
              <Link
                to="/appointments/patient"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to My Appointments
              </Link>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading appointment details...
          </div>
        ) : !appointment ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Appointment not found</h3>
            <p className="mt-2 text-sm text-slate-500">
              This appointment could not be loaded.
            </p>
            <button
              type="button"
              onClick={() => navigate("/appointments/patient")}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Doctor
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {appointment.doctorName}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Specialization
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {appointment.specialization}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Appointment Date
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {formatDate(appointment.appointmentDate)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Appointment Time
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {formatTime(appointment.appointmentTime)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Payment Status
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {appointment.paymentStatus
                      ? appointment.paymentStatus.charAt(0).toUpperCase() +
                        appointment.paymentStatus.slice(1)
                      : "Pending"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Current Status
                  </p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusBadgeClasses(
                        appointment.status
                      )}`}
                    >
                      {getStatusLabel(appointment.status, latestCancelledReason)}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Reason for Appointment
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-base font-semibold text-slate-900">
                    {appointment.reason?.trim() || "No reason provided."}
                  </p>
                </div>
              </div>
            </div>

            {latestCancelledReason ? (
              <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-sm sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                  Doctor Rejection Reason
                </p>
                <p className="mt-3 whitespace-pre-wrap text-base font-semibold text-rose-900">
                  {latestCancelledReason}
                </p>
              </div>
            ) : null}

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold text-slate-900">Status Timeline</h2>
              <div className="mt-5 space-y-4">
                {statusHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No status updates available yet.</p>
                ) : (
                  statusHistory
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <div
                        key={`${entry.status}-${entry.updatedAt || index}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span
                            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(
                              entry.status
                            )}`}
                          >
                            {getStatusLabel(entry.status, latestCancelledReason)}
                          </span>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(entry.updatedAt)}
                          </p>
                        </div>
                        {entry.note?.trim() ? (
                          <p className="mt-3 text-sm text-slate-700">{entry.note}</p>
                        ) : null}
                      </div>
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
