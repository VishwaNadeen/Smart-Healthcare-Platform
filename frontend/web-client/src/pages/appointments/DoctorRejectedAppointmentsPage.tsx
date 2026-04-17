import { useEffect, useMemo, useState } from "react";
import PageLoading from "../../components/common/PageLoading";
import {
  getDoctorAppointments,
  type Appointment,
  type PaymentStatus,
} from "../../services/appointmentApi";
import {
  getPatientSummaryByAuthUserId,
  type PatientSummaryResponse,
} from "../../services/patientApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

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

  return backendPatientName || fullName || `Patient ${appointment.patientId.slice(-6)}`;
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

export default function DoctorRejectedAppointmentsPage() {
  const auth = getStoredTelemedicineAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientsById, setPatientsById] = useState<
    Record<string, PatientSummaryResponse>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [rowsPerPage, setRowsPerPage] = useState<5 | 10 | 20>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] =
    useState<Appointment | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  function openModal(appointment: Appointment) {
    setSelectedAppointmentDetails(appointment);
    requestAnimationFrame(() => setIsModalVisible(true));
  }

  function closeModal() {
    setIsModalVisible(false);
    setTimeout(() => setSelectedAppointmentDetails(null), 250);
  }

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
            : "Failed to load rejected appointments."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDoctorAppointments();
  }, [auth.token, auth.userId]);

  const rejectedAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === "cancelled"),
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

    return rejectedAppointments
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

        const patient = patientsById[appointment.patientId];
        const patientName = getPatientDisplayName(appointment, patient).toLowerCase();
        const reason = String(appointment.reason || "").toLowerCase();
        const rejectReason = getLatestCancelledReason(appointment).toLowerCase();

        if (!normalizedSearchTerm) {
          return true;
        }

        return (
          patientName.includes(normalizedSearchTerm) ||
          appointment.specialization.toLowerCase().includes(normalizedSearchTerm) ||
          appointment.appointmentDate.toLowerCase().includes(normalizedSearchTerm) ||
          appointment.appointmentTime.toLowerCase().includes(normalizedSearchTerm) ||
          reason.includes(normalizedSearchTerm) ||
          rejectReason.includes(normalizedSearchTerm)
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
  }, [patientsById, rejectedAppointments, scheduleFilter, searchTerm]);

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

  if (isLoading) {
    return <PageLoading message="Loading rejected appointments..." />;
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 py-5 text-center md:px-6">
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Rejected Appointments
            </h1>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Review rejected bookings and the reason shared with each patient.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="mb-3 grid gap-2.5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by patient, reason, rejection note, date, or time"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
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
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
              >
                <option value="all">All days</option>
                <option value="today">Today</option>
                <option value="sevenDays">7 days</option>
                <option value="oneMonth">1 month</option>
              </select>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                {rejectedAppointments.length}
              </span>{" "}
              rejected appointments
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800 outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200">
            <h3 className="text-xl font-bold text-slate-900">No rejected appointments</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              There are no rejected appointments matching your filter.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed divide-y divide-slate-200">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[18%]" />
                  <col className="w-[15%]" />
                  <col className="w-[18%]" />
                  <col className="w-[15%]" />
                </colgroup>

                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-6 py-4">Patient</th>
                    <th className="px-6 py-4 text-center">Date</th>
                    <th className="px-6 py-4 text-center">Time</th>
                    <th className="px-6 py-4 text-center">Payment</th>
                    <th className="px-6 py-4 text-center">Details</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedAppointments.map((appointment) => {
                    const patient = patientsById[appointment.patientId];
                    const patientName = getPatientDisplayName(appointment, patient);
                    return (
                      <tr key={appointment._id} className="transition hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {patientName}
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

                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => openModal(appointment)}
                            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            View
                          </button>
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
                          ? "bg-rose-600 text-white"
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

      {selectedAppointmentDetails ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-8 transition-all duration-250 ${isModalVisible ? "bg-slate-900/40" : "bg-slate-900/0"}`}
          onClick={closeModal}
        >
          <div
            className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lg transition-all duration-250 ${isModalVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Rejected Appointment Details
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Review the full appointment information and rejection note.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
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

              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                  Rejection Reason
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-rose-900">
                  {getLatestCancelledReason(selectedAppointmentDetails) ||
                    "No rejection note provided."}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
