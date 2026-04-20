import { useEffect, useMemo, useState } from "react";
import {
  getAdminAppointmentsAnalytics,
  getDoctorVerifications,
  type AdminAnalyticsAppointment,
  type DoctorVerification,
} from "../../services/adminApi";


type StatusFilter = "all" | AdminAnalyticsAppointment["status"];
type PaymentFilter = "all" | "pending" | "paid" | "failed";

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-LK", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusLabel(status: AdminAnalyticsAppointment["status"]) {
  return status === "cancelled"
    ? "Rejected"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusClasses(status: AdminAnalyticsAppointment["status"]) {
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

function getPaymentLabel(paymentStatus?: AdminAnalyticsAppointment["paymentStatus"]) {
  if (!paymentStatus) {
    return "Pending";
  }

  return paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1);
}

function getPaymentClasses(paymentStatus?: AdminAnalyticsAppointment["paymentStatus"]) {
  switch (paymentStatus || "pending") {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "failed":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getCreatedDateKey(appointment: AdminAnalyticsAppointment) {
  if (appointment.createdAt) {
    const createdAt = new Date(appointment.createdAt);

    if (!Number.isNaN(createdAt.getTime())) {
      return createdAt.toISOString().slice(0, 10);
    }
  }

  return appointment.appointmentDate;
}


export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<AdminAnalyticsAppointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [rowsPerPage, setRowsPerPage] = useState<5 | 10 | 20>(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadAppointments() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [nextAppointments, nextDoctors] = await Promise.all([
          getAdminAppointmentsAnalytics(),
          getDoctorVerifications("all"),
        ]);

        setAppointments(Array.isArray(nextAppointments) ? nextAppointments : []);
        setDoctors(Array.isArray(nextDoctors) ? nextDoctors : []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load appointment records."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadAppointments();
  }, []);

  const doctorDirectory = useMemo(
    () =>
      doctors.reduce<Record<string, DoctorVerification>>((accumulator, doctor) => {
        accumulator[doctor._id] = doctor;
        return accumulator;
      }, {}),
    [doctors]
  );

  const tableRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return appointments
      .map((appointment) => {
        const doctor = doctorDirectory[appointment.doctorId];

        return {
          ...appointment,
          bookedOn: getCreatedDateKey(appointment),
          amount: Number(doctor?.consultationFee) || 0,
        };
      })
      .filter((appointment) => {
        if (statusFilter !== "all" && appointment.status !== statusFilter) {
          return false;
        }

        if (
          paymentFilter !== "all" &&
          (appointment.paymentStatus || "pending") !== paymentFilter
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return (
          appointment.doctorName.toLowerCase().includes(normalizedSearch) ||
          appointment.specialization.toLowerCase().includes(normalizedSearch) ||
          appointment.appointmentDate.toLowerCase().includes(normalizedSearch) ||
          appointment.appointmentTime.toLowerCase().includes(normalizedSearch) ||
          (appointment.reason || "").toLowerCase().includes(normalizedSearch) ||
          getStatusLabel(appointment.status).toLowerCase().includes(normalizedSearch) ||
          getPaymentLabel(appointment.paymentStatus).toLowerCase().includes(
            normalizedSearch
          )
        );
      })
      .sort((left, right) => {
        const leftTime = new Date(
          `${left.appointmentDate}T${left.appointmentTime}`
        ).getTime();
        const rightTime = new Date(
          `${right.appointmentDate}T${right.appointmentTime}`
        ).getTime();

        return rightTime - leftTime;
      });
  }, [appointments, doctorDirectory, paymentFilter, searchTerm, statusFilter]);

  const summary = useMemo(
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
      paid: appointments.filter((appointment) => appointment.paymentStatus === "paid")
        .length,
    }),
    [appointments]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [paymentFilter, rowsPerPage, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return tableRows.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, rowsPerPage, tableRows]);

  const pageStart = tableRows.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(currentPage * rowsPerPage, tableRows.length);

  

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Appointment Management</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Monitor all appointments, filter by status and payment, review schedules.
        </p>
      </section>

      {/* Stats Section */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-4 transition hover:shadow-md hover:scale-105">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-600">Total</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.total}</p>
            </div>
            <div className="rounded-full bg-slate-100 p-2 text-2xl">📋</div>
          </div>
        </div>
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 transition hover:shadow-md hover:scale-105">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-700">Pending</p>
              <p className="mt-3 text-3xl font-bold text-amber-900">{summary.pending}</p>
            </div>
            <div className="rounded-full bg-amber-100 p-2 text-2xl">⏳</div>
          </div>
        </div>
        <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4 transition hover:shadow-md hover:scale-105">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">Confirmed</p>
              <p className="mt-3 text-3xl font-bold text-emerald-900">{summary.confirmed}</p>
            </div>
            <div className="rounded-full bg-emerald-100 p-2 text-2xl">✓</div>
          </div>
        </div>
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 transition hover:shadow-md hover:scale-105">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-blue-700">Completed</p>
              <p className="mt-3 text-3xl font-bold text-blue-900">{summary.completed}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-2 text-2xl">🎉</div>
          </div>
        </div>
        <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 transition hover:shadow-md hover:scale-105">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-green-700">Paid</p>
              <p className="mt-3 text-3xl font-bold text-green-900">{summary.paid}</p>
            </div>
            <div className="rounded-full bg-green-100 p-2 text-2xl">💰</div>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">Appointments</h2>
          <p className="mt-1 text-sm text-slate-600">
            Search, filter, and review all appointment records
          </p>
        </div>

        <div className="grid gap-3 border-b border-slate-200 px-6 py-4 lg:grid-cols-4">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by doctor, specialty, date..."
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Rejected</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(event) =>
              setPaymentFilter(event.target.value as PaymentFilter)
            }
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">All payments</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={rowsPerPage}
            onChange={(event) =>
              setRowsPerPage(Number(event.target.value) as 5 | 10 | 20)
            }
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option value={5}>5 rows</option>
            <option value={10}>10 rows</option>
            <option value={20}>20 rows</option>
          </select>
        </div>

        {isLoading ? (
          <div className="px-6 py-10 text-sm text-slate-600">Loading...</div>
        ) : tableRows.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-600">
            No appointments match the current search and filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Doctor</th>
                    <th className="px-6 py-4">Specialty</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Booked</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Amount</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedRows.map((row) => (
                    <tr key={row._id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-slate-900">
                          {row.doctorName}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {row.doctorId.slice(-8)}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-700">
                        {row.specialization}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-700">
                        {formatDate(row.appointmentDate)}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-700">
                        {formatTime(row.appointmentTime)}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-700">
                        {formatDate(row.bookedOn)}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentClasses(
                            row.paymentStatus
                          )}`}
                        >
                          {getPaymentLabel(row.paymentStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            row.status
                          )}`}
                        >
                          {getStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-slate-900">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <p className="text-sm text-slate-600">
                Showing{" "}
                <span className="font-semibold text-slate-900">{pageStart}</span> to{" "}
                <span className="font-semibold text-slate-900">{pageEnd}</span> of{" "}
                <span className="font-semibold text-slate-900">{tableRows.length}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
