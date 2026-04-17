import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../components/common/toastContext";
import PageLoading from "../../components/common/PageLoading";
import {
  getDoctorAppointments,
  updateDoctorAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
  type PaymentStatus,
} from "../../services/appointmentApi";
import {
  getPatientSummaryByAuthUserId,
  type PatientSummaryResponse,
} from "../../services/patientApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";
import NoDocAppointments from "./noDocAppointments";

type ScheduleFilter = "all" | "today" | "sevenDays" | "oneMonth";

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

function getAppointmentDateTimeValue(appointment: Appointment) {
  return new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
}

function getStatusLabel(status: AppointmentStatus) {
  if (status === "cancelled") {
    return "Rejected";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getPaymentBadgeClasses(paymentStatus?: PaymentStatus) {
  switch (paymentStatus) {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "failed":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getPaymentLabel(paymentStatus?: Appointment["paymentStatus"]) {
  if (!paymentStatus) return "Pending";
  return paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1);
}

function getPatientDisplayName(
  appointment: Appointment,
  patient?: PatientSummaryResponse
) {
  const fullName = `${patient?.firstName || ""} ${patient?.lastName || ""}`.trim();
  const backendPatientName =
    typeof appointment.patientName === "string" ? appointment.patientName : "";

  return (
    backendPatientName ||
    fullName ||
    `Patient ${appointment.patientId.slice(-6)}`
  );
}

function getLatestCancelledReason(appointment: Appointment) {
  const latestCancelledEntry = [...(appointment.statusHistory || [])]
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

export default function DoctorAppointmentsPage() {
  const auth = getStoredTelemedicineAuth();
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientsById, setPatientsById] = useState<
    Record<string, PatientSummaryResponse>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [rowsPerPage, setRowsPerPage] = useState<5 | 10 | 20>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectingAppointmentId, setRejectingAppointmentId] = useState<string | null>(
    null
  );
  const [rejectReason, setRejectReason] = useState("");
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] =
    useState<Appointment | null>(null);

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
        const safeAppointments = Array.isArray(nextAppointments) ? nextAppointments : [];

        setAppointments(safeAppointments);

        const patientIds = [...new Set(safeAppointments.map((item) => item.patientId))];

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
          patientEntries.reduce<Record<string, PatientSummaryResponse>>(
            (accumulator, [patientId, patient]) => {
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

    void loadDoctorAppointments();
  }, [auth.token, auth.userId]);

  const pendingAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === "pending"),
    [appointments]
  );

  const filteredAppointments = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromToday = new Date(today);
    sevenDaysFromToday.setDate(sevenDaysFromToday.getDate() + 7);

    const oneMonthFromToday = new Date(today);
    oneMonthFromToday.setMonth(oneMonthFromToday.getMonth() + 1);

    return pendingAppointments
      .filter((appointment) => {
        const appointmentDateTime = getAppointmentDateTimeValue(appointment);
        const appointmentDay = new Date(appointmentDateTime);
        appointmentDay.setHours(0, 0, 0, 0);

        if (scheduleFilter === "today" && appointmentDay.getTime() !== today.getTime()) {
          return false;
        }

        if (
          scheduleFilter === "sevenDays" &&
          (appointmentDay.getTime() < today.getTime() ||
            appointmentDay.getTime() > sevenDaysFromToday.getTime())
        ) {
          return false;
        }

        if (
          scheduleFilter === "oneMonth" &&
          (appointmentDay.getTime() < today.getTime() ||
            appointmentDay.getTime() > oneMonthFromToday.getTime())
        ) {
          return false;
        }

        if (!normalizedSearchTerm) {
          return true;
        }

        const patient = patientsById[appointment.patientId];
        const patientName = getPatientDisplayName(appointment, patient).toLowerCase();
        const reason = String(appointment.reason || "").toLowerCase();

        return (
          patientName.includes(normalizedSearchTerm) ||
          appointment.specialization.toLowerCase().includes(normalizedSearchTerm) ||
          appointment.appointmentDate.toLowerCase().includes(normalizedSearchTerm) ||
          appointment.appointmentTime.toLowerCase().includes(normalizedSearchTerm) ||
          reason.includes(normalizedSearchTerm)
        );
      })
      .sort((left, right) => {
        const leftDate = new Date(
          `${left.appointmentDate}T${left.appointmentTime}`
        ).getTime();
        const rightDate = new Date(
          `${right.appointmentDate}T${right.appointmentTime}`
        ).getTime();

        return rightDate - leftDate;
      });
  }, [patientsById, pendingAppointments, scheduleFilter, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, scheduleFilter, searchTerm]);

  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredAppointments.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, filteredAppointments, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleUpdateAppointmentStatus(
    appointmentId: string,
    status: Extract<AppointmentStatus, "confirmed" | "cancelled">,
    note?: string
  ) {
    if (!auth.token) {
      setErrorMessage("You must be logged in to manage appointment requests.");
      return;
    }

    try {
      setErrorMessage("");
      setActionLoadingId(appointmentId);

      const data = await updateDoctorAppointmentStatus(
        auth.token,
        appointmentId,
        status,
        note
      );

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment._id === appointmentId
            ? {
                ...appointment,
                ...(data.appointment || {}),
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

      if (status === "cancelled") {
        setRejectingAppointmentId(null);
        setRejectReason("");
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update appointment request."
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  if (isLoading) {
    return <PageLoading message="Loading appointment requests..." />;
  }

  if (pendingAppointments.length === 0) {
    return (
      <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          <NoDocAppointments
            viewScheduleLink="/doctor-sessions"
            editAvailabilityLink="/doctor-availability"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-200" />
          <div className="px-4 py-5 text-center md:px-6">
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Appointment Requests
            </h1>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Review incoming bookings, respond quickly, and keep your daily schedule organized.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="p-4 sm:p-5">
            <div className="mb-3 grid gap-2.5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by patient, reason, date, or time"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Schedule
                </label>
                <select
                  value={scheduleFilter}
                  onChange={(event) =>
                    setScheduleFilter(event.target.value as ScheduleFilter)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="all">All days</option>
                  <option value="today">Today</option>
                  <option value="sevenDays">7 days</option>
                  <option value="oneMonth">1 month</option>
                </select>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
              <p className="text-sm text-blue-600">
                <span className="font-semibold text-blue-700">
                  {pendingAppointments.length}
                </span>{" "}
                pending appointment requests awaiting review.
              </p>

              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700">
                  Rows per page
                </label>
                <select
                  value={rowsPerPage}
                  onChange={(event) =>
                    setRowsPerPage(Number(event.target.value) as 5 | 10 | 20)
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-slate-200">
                <h3 className="text-xl font-bold text-slate-900">No matching appointments</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Try changing the search text or schedule filter.
                </p>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed divide-y divide-slate-200">
                    <colgroup>
                      <col className="w-[16.66%]" />
                      <col className="w-[16.66%]" />
                      <col className="w-[16.66%]" />
                      <col className="w-[16.66%]" />
                      <col className="w-[16.66%]" />
                      <col className="w-[16.66%]" />
                    </colgroup>

                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <th className="px-6 py-4">Patient</th>
                        <th className="px-6 py-4 text-center">Age</th>
                        <th className="px-6 py-4 text-center">Date</th>
                        <th className="px-6 py-4 text-center">Time</th>
                        <th className="px-6 py-4 text-center whitespace-nowrap">
                          Payment Status
                        </th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                      {paginatedAppointments.map((appointment) => {
                        const patient = patientsById[appointment.patientId];
                        const patientName = getPatientDisplayName(appointment, patient);
                        const isActionLoading = actionLoadingId === appointment._id;

                        return (
                          <tr
                            key={appointment._id}
                            className="cursor-pointer align-top transition hover:bg-slate-50"
                            onClick={() => setSelectedAppointmentDetails(appointment)}
                          >
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-semibold text-slate-900">{patientName}</p>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center text-sm text-slate-700">
                              {patient?.age ?? "N/A"}
                            </td>

                            <td className="px-6 py-4 text-center text-sm text-slate-700">
                              {formatDate(appointment.appointmentDate)}
                            </td>

                            <td className="px-6 py-4 text-center text-sm text-slate-700">
                              {formatTime(appointment.appointmentTime)}
                            </td>

                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentBadgeClasses(
                                  appointment.paymentStatus
                                )}`}
                              >
                                {getPaymentLabel(appointment.paymentStatus)}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <div className="flex justify-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    disabled={isActionLoading || appointment.paymentStatus === "pending"}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleUpdateAppointmentStatus(
                                        appointment._id,
                                        "confirmed"
                                      );
                                    }}
                                    className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isActionLoading ? "..." : "Accept"}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isActionLoading}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setRejectingAppointmentId(appointment._id);
                                      setRejectReason("");
                                    }}
                                    className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm text-slate-500">
                    Page <span className="font-semibold text-slate-700">{currentPage}</span> of{" "}
                    <span className="font-semibold text-slate-700">{totalPages}</span>
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalPages }, (_, index) => index + 1)
                      .slice(Math.max(0, currentPage - 2), Math.max(0, currentPage - 2) + 3)
                      .map((pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                            currentPage === pageNumber
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      ))}

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {rejectingAppointmentId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => {
            setRejectingAppointmentId(null);
            setRejectReason("");
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-900">Reject Appointment</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Please provide a clear reason. The patient will be able to see this
              message.
            </p>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Rejection Reason
            </label>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              placeholder="Example: Please upload recent lab reports and book again for next week."
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectingAppointmentId(null);
                  setRejectReason("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!rejectReason.trim() || actionLoadingId === rejectingAppointmentId}
                onClick={() => {
                  if (!rejectingAppointmentId) return;

                  void handleUpdateAppointmentStatus(
                    rejectingAppointmentId,
                    "cancelled",
                    rejectReason.trim()
                  );
                }}
                className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoadingId === rejectingAppointmentId
                  ? "Rejecting..."
                  : "Reject Appointment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedAppointmentDetails ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8"
          onClick={() => setSelectedAppointmentDetails(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Appointment Details
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Review the full appointment information, including the patient's
                  issue and booking status.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAppointmentDetails(null)}
                className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Doctor
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedAppointmentDetails.doctorName}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Specialization
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedAppointmentDetails.specialization}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Appointment Date
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDate(selectedAppointmentDetails.appointmentDate)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Appointment Time
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatTime(selectedAppointmentDetails.appointmentTime)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Payment Status
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {getPaymentLabel(selectedAppointmentDetails.paymentStatus)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {getStatusLabel(selectedAppointmentDetails.status)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Reason for Appointment
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-900">
                  {selectedAppointmentDetails.reason?.trim() ||
                    "No reason provided by the patient."}
                </p>
              </div>

              {getLatestCancelledReason(selectedAppointmentDetails) ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                    Rejection Reason
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-rose-900">
                    {getLatestCancelledReason(selectedAppointmentDetails)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
