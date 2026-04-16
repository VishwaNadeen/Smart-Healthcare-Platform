import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../components/common/toastContext";
import PageLoading from "../../components/common/PageLoading";
import {
  getDoctorAppointments,
  updateDoctorAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../../services/appointmentApi";
import {
  getPatientDetailsByAuthUserId,
  getPatientSummaryByAuthUserId,
  type PatientDetailsResponse,
  type PatientSummaryResponse,
} from "../../services/patientApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";
import NoDocAppointments from "./noDocAppointments";

type FilterStatus = "all" | AppointmentStatus;
type ScheduleFilter = "all" | "today" | "upcoming" | "past";

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

function getStatusLabel(status: AppointmentStatus) {
  if (status === "cancelled") {
    return "Rejected";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
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

  return (
    (typeof appointment.patientName === "string" && appointment.patientName.trim()) ||
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

function AppointmentActionIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="4.5" width="13" height="12" rx="2.5" />
      <path d="M6.5 2.75v3.5M13.5 2.75v3.5M3.5 8.5h13" />
    </svg>
  );
}

function PatientActionIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="6.5" r="3" />
      <path d="M4.5 16c1.3-2.6 3.14-4 5.5-4s4.2 1.4 5.5 4" />
    </svg>
  );
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
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [rowsPerPage, setRowsPerPage] = useState<5 | 10 | 20>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectingAppointmentId, setRejectingAppointmentId] = useState<string | null>(
    null
  );
  const [rejectReason, setRejectReason] = useState("");
  const [selectedPatientDetails, setSelectedPatientDetails] =
    useState<PatientDetailsResponse | null>(null);
  const [patientDetailsLoadingId, setPatientDetailsLoadingId] = useState<string | null>(
    null
  );
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
          patientEntries.reduce<Record<string, PatientSummaryResponse>>(
            (accumulator, entry) => {
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

  const filteredAppointments = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return appointments
      .filter((appointment) => {
        if (statusFilter !== "all" && appointment.status !== statusFilter) {
          return false;
        }

        const appointmentDateTime = getAppointmentDateTimeValue(appointment);
        const appointmentDay = new Date(appointmentDateTime);
        appointmentDay.setHours(0, 0, 0, 0);

        if (scheduleFilter === "today" && appointmentDay.getTime() !== today.getTime()) {
          return false;
        }

        if (scheduleFilter === "upcoming" && appointmentDateTime.getTime() < Date.now()) {
          return false;
        }

        if (scheduleFilter === "past" && appointmentDateTime.getTime() >= Date.now()) {
          return false;
        }

        if (!normalizedSearchTerm) {
          return true;
        }

        const patient = patientsById[appointment.patientId];
        const patientName = getPatientDisplayName(appointment, patient).toLowerCase();
        const reason = String(appointment.reason || "").toLowerCase();
        const doctorReason = getLatestCancelledReason(appointment).toLowerCase();

        return (
          patientName.includes(normalizedSearchTerm) ||
          appointment.specialization.toLowerCase().includes(normalizedSearchTerm) ||
          appointment.appointmentDate.toLowerCase().includes(normalizedSearchTerm) ||
          appointment.appointmentTime.toLowerCase().includes(normalizedSearchTerm) ||
          reason.includes(normalizedSearchTerm) ||
          doctorReason.includes(normalizedSearchTerm)
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
  }, [
    appointments,
    patientsById,
    scheduleFilter,
    searchTerm,
    statusFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, scheduleFilter, searchTerm, statusFilter]);

  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredAppointments.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, filteredAppointments, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / rowsPerPage));
  const pageStart = filteredAppointments.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(currentPage * rowsPerPage, filteredAppointments.length);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const summaryCounts = useMemo(
    () => ({
      total: appointments.length,
      pending: appointments.filter((appointment) => appointment.status === "pending")
        .length,
      confirmed: appointments.filter(
        (appointment) => appointment.status === "confirmed"
      ).length,
      completed: appointments.filter(
        (appointment) => appointment.status === "completed"
      ).length,
      cancelled: appointments.filter(
        (appointment) => appointment.status === "cancelled"
      ).length,
    }),
    [appointments]
  );


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
      setActionLoadingId(appointmentId);

      const data = await updateDoctorAppointmentStatus(
        auth.token,
        appointmentId,
        status
      );

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment._id === appointmentId
            ? { ...appointment, status: data.appointment?.status ?? status }
            : appointment
        )
      );

      showToast(
        data.message ||
          (status === "confirmed"
            ? "Appointment request accepted successfully."
            : "Appointment request cancelled successfully."),
        "success",
        3000
      );
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

  async function handleOpenPatientDetails(appointment: Appointment) {
    if (!auth.token) {
      setErrorMessage("You must be logged in to view patient details.");
      return;
    }

    try {
      setErrorMessage("");
      setPatientDetailsLoadingId(appointment.patientId);

      const patientDetails = await getPatientDetailsByAuthUserId(
        auth.token,
        appointment.patientId
      );

      setSelectedPatientDetails(patientDetails);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load patient details."
      );
    } finally {
      setPatientDetailsLoadingId(null);
    }
  }

  if (isLoading) {
    return <PageLoading message="Loading appointment requests..." />;
  }

  if (appointments.length === 0) {
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
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Appointment Requests
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
            Review, search, filter, accept, and reject appointment requests from one
            place. Rejected appointments stay visible for follow-up and audit.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Total
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {summaryCounts.total}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Pending
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-800">
                {summaryCounts.pending}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Confirmed
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-800">
                {summaryCounts.confirmed}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                Rejected
              </p>
              <p className="mt-2 text-2xl font-bold text-rose-800">
                {summaryCounts.cancelled}
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Appointments Table</h2>
              <p className="mt-2 text-sm text-slate-500">
                Search, filter, and review appointment records with pagination.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
              {filteredAppointments.length} matching appointment
              {filteredAppointments.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-[1.6fr_0.9fr_0.8fr]">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by patient, reason, date, or time"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">All appointments</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Rejected</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Schedule
              </label>
              <select
                value={scheduleFilter}
                onChange={(event) =>
                  setScheduleFilter(event.target.value as ScheduleFilter)
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">All dates</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{pageStart}</span> to{" "}
              <span className="font-semibold text-slate-700">{pageEnd}</span> of{" "}
              <span className="font-semibold text-slate-700">
                {filteredAppointments.length}
              </span>{" "}
              appointments
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200">
            <h3 className="text-xl font-bold text-slate-900">No matching appointments</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Try changing the search text or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed divide-y divide-slate-200">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                  <col className="w-[12%]" />
                  <col className="w-[24%]" />
                </colgroup>
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-4">Patient</th>
                    <th className="px-4 py-4 text-center">Date</th>
                    <th className="px-4 py-4 text-center">Time</th>
                    <th className="px-4 py-4 text-center">Status</th>
                    <th className="px-4 py-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedAppointments.map((appointment) => {
                    const patient = patientsById[appointment.patientId];
                    const patientName = getPatientDisplayName(appointment, patient);
                    const isPending = appointment.status === "pending";
                    const isActionLoading = actionLoadingId === appointment._id;

                    return (
                      <tr key={appointment._id} className="align-top">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">{patientName}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {appointment.specialization}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-slate-700">
                          {formatDate(appointment.appointmentDate)}
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-slate-700">
                          {formatTime(appointment.appointmentTime)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(
                              appointment.status
                            )}`}
                          >
                            {getStatusLabel(appointment.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex min-w-[240px] flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedAppointmentDetails(appointment)}
                              title="View appointment"
                              aria-label="View appointment"
                              className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                              <AppointmentActionIcon />
                              <span>Appointment</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleOpenPatientDetails(appointment)}
                              disabled={patientDetailsLoadingId === appointment.patientId}
                              title="View patient"
                              aria-label="View patient"
                              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <PatientActionIcon />
                              {patientDetailsLoadingId === appointment.patientId
                                ? "Loading..."
                                : "Patient"}
                            </button>

                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isActionLoading}
                                  onClick={() =>
                                    void handleUpdateAppointmentStatus(
                                      appointment._id,
                                      "confirmed"
                                    )
                                  }
                                  className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isActionLoading ? "Updating..." : "Accept"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isActionLoading}
                                  onClick={() => {
                                    setRejectingAppointmentId(appointment._id);
                                    setRejectReason("");
                                  }}
                                  className="inline-flex h-10 items-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
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

      {rejectingAppointmentId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">Reject Appointment</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Please provide a reason. The patient will be able to see this message.
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
                  if (!rejectingAppointmentId) {
                    return;
                  }

                  void handleUpdateAppointmentStatus(
                    rejectingAppointmentId,
                    "cancelled"
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

      {selectedPatientDetails ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Patient Details</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Review the patient information linked to this appointment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatientDetails(null)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Full Name
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {[
                    selectedPatientDetails.title,
                    selectedPatientDetails.firstName,
                    selectedPatientDetails.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Age
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedPatientDetails.age ?? "Not available"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Email
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedPatientDetails.email || "Not available"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Phone
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {[selectedPatientDetails.countryCode, selectedPatientDetails.phone]
                    .filter(Boolean)
                    .join(" ") || "Not available"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  NIC
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedPatientDetails.nic || "Not available"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Birthday
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedPatientDetails.birthday
                    ? formatDate(selectedPatientDetails.birthday)
                    : "Not available"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Gender
                </p>
                <p className="mt-2 text-sm font-semibold capitalize text-slate-900">
                  {selectedPatientDetails.gender || "Not available"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Country
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedPatientDetails.country || "Not available"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Address
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedPatientDetails.address || "Not available"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedAppointmentDetails ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
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
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
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
