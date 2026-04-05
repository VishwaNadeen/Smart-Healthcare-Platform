import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  getDoctorAppointments,
  type Appointment,
} from "../../services/appointmentApi";
import { getCurrentDoctorProfile } from "../../services/doctorApi";
import {
  getPatientSummaryByAuthUserId,
  type PatientSummaryResponse,
} from "../../services/patientApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

type EarningsPaymentFilter = "all" | "paid" | "pending" | "failed";

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount);
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

export default function DoctorEarningsPage() {
  const auth = getStoredTelemedicineAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientsById, setPatientsById] = useState<Record<string, PatientSummaryResponse>>(
    {}
  );
  const [consultationFee, setConsultationFee] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] =
    useState<EarningsPaymentFilter>("all");
  const [rowsPerPage, setRowsPerPage] = useState<5 | 10 | 20>(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadEarningsData() {
      if (!auth.token || !auth.userId) {
        setErrorMessage("No doctor login found.");
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage("");

        const [doctorAppointments, doctorProfile] = await Promise.all([
          getDoctorAppointments(auth.token, auth.userId),
          getCurrentDoctorProfile(auth.token).catch(() => null),
        ]);

        const normalizedAppointments = Array.isArray(doctorAppointments)
          ? doctorAppointments
          : [];

        setAppointments(normalizedAppointments);
        setConsultationFee(Number(doctorProfile?.consultationFee) || 0);

        const patientIds = [
          ...new Set(normalizedAppointments.map((appointment) => appointment.patientId)),
        ];

        if (patientIds.length === 0) {
          setPatientsById({});
          return;
        }

        const patientEntries = await Promise.all(
          patientIds.map(async (patientId) => {
            try {
              const patient = await getPatientSummaryByAuthUserId(auth.token!, patientId);
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
          error instanceof Error ? error.message : "Failed to load earnings data."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadEarningsData();
  }, [auth.token, auth.userId]);

  const earningsData = useMemo(() => {
    const paidAppointments = appointments
      .filter((appointment) => appointment.paymentStatus === "paid")
      .sort((left, right) => {
        const leftDate = new Date(
          `${left.appointmentDate}T${left.appointmentTime}`
        ).getTime();
        const rightDate = new Date(
          `${right.appointmentDate}T${right.appointmentTime}`
        ).getTime();

        return rightDate - leftDate;
      });
    const pendingPayments = appointments.filter(
      (appointment) => appointment.paymentStatus === "pending"
    );
    const failedPayments = appointments.filter(
      (appointment) => appointment.paymentStatus === "failed"
    );

    const collected = paidAppointments.length * consultationFee;
    const pending = pendingPayments.length * consultationFee;
    const failed = failedPayments.length * consultationFee;
    const totalValue = collected + pending + failed;
    const pieSegments = [
      {
        key: "collected",
        label: "Collected",
        value: collected,
        color: "#10b981",
      },
      {
        key: "pending",
        label: "Pending",
        value: pending,
        color: "#f59e0b",
      },
      {
        key: "failed",
        label: "Failed",
        value: failed,
        color: "#f43f5e",
      },
    ].map((segment, index, list) => {
      const previousValue = list
        .slice(0, index)
        .reduce((sum, item) => sum + item.value, 0);

      return {
        ...segment,
        offset: totalValue > 0 ? (previousValue / totalValue) * 100 : 0,
        percentage: totalValue > 0 ? (segment.value / totalValue) * 100 : 0,
      };
    });

    return {
      paidAppointments,
      collected,
      pending,
      failed,
      pieSegments,
    };
  }, [appointments, consultationFee]);

  const earningsRecords = useMemo(() => {
    return appointments
      .map((appointment) => {
        const patient = patientsById[appointment.patientId];
        const paymentStatus = appointment.paymentStatus || "pending";

        return {
          ...appointment,
          patientName: getPatientDisplayName(appointment, patient),
          amount: consultationFee,
          paymentStatus,
        };
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
  }, [appointments, consultationFee, patientsById]);

  const filteredEarningsRecords = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return earningsRecords.filter((record) => {
      if (paymentFilter !== "all" && record.paymentStatus !== paymentFilter) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      return (
        record.patientName.toLowerCase().includes(normalizedSearchTerm) ||
        record.appointmentDate.toLowerCase().includes(normalizedSearchTerm) ||
        record.appointmentTime.toLowerCase().includes(normalizedSearchTerm) ||
        record.specialization.toLowerCase().includes(normalizedSearchTerm) ||
        (record.reason || "").toLowerCase().includes(normalizedSearchTerm) ||
        record.paymentStatus.toLowerCase().includes(normalizedSearchTerm)
      );
    });
  }, [earningsRecords, paymentFilter, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [paymentFilter, rowsPerPage, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEarningsRecords.length / rowsPerPage)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedEarningsRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredEarningsRecords.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, filteredEarningsRecords, rowsPerPage]);

  const pageStart =
    filteredEarningsRecords.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(
    currentPage * rowsPerPage,
    filteredEarningsRecords.length
  );

  function handleExportCsv() {
    const rows = filteredEarningsRecords.map((record) => [
      record.patientName,
      record.specialization,
      formatDate(record.appointmentDate),
      formatTime(record.appointmentTime),
      record.paymentStatus,
      String(record.amount),
      (record.reason || "").replace(/\r?\n/g, " ").trim(),
    ]);

    const csvContent = [
      [
        "Patient",
        "Specialization",
        "Appointment Date",
        "Appointment Time",
        "Payment Status",
        "Amount",
        "Reason",
      ],
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "doctor-earnings.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    if (filteredEarningsRecords.length === 0) {
      setErrorMessage("No earnings records are available to export.");
      return;
    }

    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
    });

    const generatedOn = new Date().toLocaleString("en-LK");
    const lineHeight = 4.5;
    const tableLeft = 14;
    const tableWidth = 182;
    const columnWidths = [34, 24, 24, 20, 20, 24, 36];
    const columns = [
      "Patient",
      "Specialty",
      "Date",
      "Time",
      "Payment",
      "Amount",
      "Reason",
    ];
    let y = 18;

    const drawTableHeader = (top: number) => {
      let x = tableLeft;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.rect(tableLeft, top, tableWidth, 10, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      columns.forEach((label, index) => {
        doc.text(label, x + 2, top + 6);
        x += columnWidths[index];
      });

      return top + 10;
    };

    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, 210, 30, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("Doctor Earnings Report", 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Filtered revenue records from the earnings table.", 14, 23);

    y = 40;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Generated on: ${generatedOn}`, 14, y);
    y += 8;
    doc.text(
      `Payment filter: ${paymentFilter}, Rows exported: ${filteredEarningsRecords.length}`,
      14,
      y
    );
    y += 10;

    const summaryLines = [
      `Consultation fee: ${
        consultationFee > 0 ? formatCurrency(consultationFee) : "Not set"
      }`,
      `Collected: ${formatCurrency(earningsData.collected)}`,
      `Pending: ${formatCurrency(earningsData.pending)}`,
      `Failed: ${formatCurrency(earningsData.failed)}`,
      `Paid appointments: ${earningsData.paidAppointments.length}`,
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    summaryLines.forEach((line) => {
      doc.text(line, 14, y);
      y += 6;
    });

    y += 6;
    y = drawTableHeader(y);

    filteredEarningsRecords.forEach((record, index) => {
      const rowValues = [
        record.patientName,
        record.specialization,
        formatDate(record.appointmentDate),
        formatTime(record.appointmentTime),
        record.paymentStatus.charAt(0).toUpperCase() + record.paymentStatus.slice(1),
        formatCurrency(record.amount),
        record.reason?.trim() || "-",
      ];
      const wrappedCells = rowValues.map((value, cellIndex) =>
        doc.splitTextToSize(String(value), columnWidths[cellIndex] - 4)
      );
      const rowHeight =
        Math.max(...wrappedCells.map((lines) => lines.length), 1) * lineHeight + 4;

      if (y + rowHeight > 282) {
        doc.addPage();
        y = 18;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Doctor Earnings Report (continued)", 14, y);
        y += 10;
        y = drawTableHeader(y);
      }

      let x = tableLeft;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.rect(tableLeft, y, tableWidth, rowHeight, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);

      wrappedCells.forEach((lines, cellIndex) => {
        if (cellIndex > 0) {
          doc.line(x, y, x, y + rowHeight);
        }

        doc.text(lines, x + 2, y + 5);
        x += columnWidths[cellIndex];
      });

      if (index < filteredEarningsRecords.length - 1) {
        doc.line(tableLeft, y + rowHeight, tableLeft + tableWidth, y + rowHeight);
      }

      y += rowHeight;
    });

    doc.save("doctor-earnings-report.pdf");
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Doctor Earnings
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
            Review your payment snapshot, track collected revenue, and scan recent
            paid appointments in one place.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
            Loading earnings...
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Earnings
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">
                      Payment snapshot
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Estimated using your consultation fee and each appointment&apos;s
                      payment status.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Fee per appointment
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {consultationFee > 0
                        ? formatCurrency(consultationFee)
                        : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                  <div className="flex items-center justify-center">
                    <div className="relative h-48 w-48">
                      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                        <circle
                          cx="60"
                          cy="60"
                          r="42"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="14"
                        />
                        {earningsData.pieSegments.map((segment) => (
                          <circle
                            key={segment.key}
                            cx="60"
                            cy="60"
                            r="42"
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="14"
                            strokeLinecap="round"
                            strokeDasharray={`${segment.percentage * 2.64} 264`}
                            strokeDashoffset={-segment.offset * 2.64}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Collected
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {formatCurrency(earningsData.collected)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        Collected
                      </p>
                      <p className="mt-2 text-2xl font-bold text-emerald-900">
                        {formatCurrency(earningsData.collected)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                        Pending
                      </p>
                      <p className="mt-2 text-2xl font-bold text-amber-900">
                        {formatCurrency(earningsData.pending)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                        Failed
                      </p>
                      <p className="mt-2 text-2xl font-bold text-rose-900">
                        {formatCurrency(earningsData.failed)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Paid Records
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {earningsData.paidAppointments.length}
                      </p>
                    </div>

                    {earningsData.pieSegments.map((segment) => (
                      <div
                        key={segment.key}
                        className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: segment.color }}
                            />
                            <p className="text-sm font-semibold text-slate-700">
                              {segment.label}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-slate-900">
                            {formatCurrency(segment.value)}
                          </p>
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                          {segment.percentage.toFixed(0)}% of tracked payment value
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Earnings Table
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    Revenue records
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 md:grid-cols-[1.3fr_0.8fr_0.6fr]">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Search
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by patient, specialty, date, time, or payment"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Payment Filter
                    </label>
                    <select
                      value={paymentFilter}
                      onChange={(event) =>
                        setPaymentFilter(event.target.value as EarningsPaymentFilter)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="all">All payments</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Rows
                    </label>
                    <select
                      value={rowsPerPage}
                      onChange={(event) =>
                        setRowsPerPage(Number(event.target.value) as 5 | 10 | 20)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{pageStart}</span> to{" "}
                    <span className="font-semibold text-slate-700">{pageEnd}</span> of{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredEarningsRecords.length}
                    </span>{" "}
                    records
                  </p>
                  <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
                    {earningsData.paidAppointments.length} paid appointment
                    {earningsData.paidAppointments.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>

              {filteredEarningsRecords.length > 0 ? (
                <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <th className="px-4 py-4">Patient</th>
                          <th className="px-4 py-4">Specialty</th>
                          <th className="px-4 py-4">Date</th>
                          <th className="px-4 py-4">Time</th>
                          <th className="px-4 py-4">Payment</th>
                          <th className="px-4 py-4">Amount</th>
                          <th className="px-4 py-4">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {paginatedEarningsRecords.map((record) => (
                          <tr key={record._id}>
                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                              {record.patientName}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {record.specialization}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {formatDate(record.appointmentDate)}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {formatTime(record.appointmentTime)}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                  record.paymentStatus === "paid"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : record.paymentStatus === "failed"
                                      ? "border-rose-200 bg-rose-50 text-rose-700"
                                      : "border-amber-200 bg-amber-50 text-amber-700"
                                }`}
                              >
                                {record.paymentStatus.charAt(0).toUpperCase() +
                                  record.paymentStatus.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                              {formatCurrency(record.amount)}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {record.reason?.trim() || "-"}
                            </td>
                          </tr>
                        ))}
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
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                  No earnings records match the current filters.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
