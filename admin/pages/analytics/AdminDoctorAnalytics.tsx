import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  getAdminAppointmentActivity,
  getAdminAppointmentsAnalytics,
  getDoctorVerifications,
  type AdminAnalyticsAppointment,
  type AdminAppointmentActivity,
  type DoctorVerification,
} from "../../services/adminApi";

type ActivitySeriesKey = "pending" | "confirmed" | "completed" | "rejected";
type ActivityRangePreset = "7d" | "14d" | "30d" | "custom";
type TableStatusFilter = "all" | AdminAnalyticsAppointment["status"];
type TablePaymentFilter = "all" | "pending" | "paid" | "failed";

const ACTIVITY_RANGE_OPTIONS: Array<{
  value: ActivityRangePreset;
  label: string;
  days?: number;
}> = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "14d", label: "14 days", days: 14 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "custom", label: "Custom" },
];

const ACTIVITY_SERIES: Array<{
  key: ActivitySeriesKey;
  label: string;
  stroke: string;
  dot: string;
}> = [
  { key: "pending", label: "Pending", stroke: "#f59e0b", dot: "#fbbf24" },
  { key: "confirmed", label: "Confirmed", stroke: "#10b981", dot: "#34d399" },
  { key: "completed", label: "Completed", stroke: "#2563eb", dot: "#60a5fa" },
  { key: "rejected", label: "Rejected", stroke: "#f43f5e", dot: "#fb7185" },
];

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

function getActivityDateKey(appointment: AdminAnalyticsAppointment) {
  if (appointment.createdAt) {
    const createdAt = new Date(appointment.createdAt);

    if (!Number.isNaN(createdAt.getTime())) {
      return createdAt.toISOString().slice(0, 10);
    }
  }

  return appointment.appointmentDate;
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points.reduce(
    (path, point, index) => `${path}${index === 0 ? "M" : " L"} ${point.x} ${point.y}`,
    ""
  );
}

function buildAreaPath(
  points: Array<{ x: number; y: number }>,
  baselineY: number
) {
  if (points.length === 0) {
    return "";
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `${buildLinePath(points)} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminDoctorAnalytics() {
  const [appointments, setAppointments] = useState<AdminAnalyticsAppointment[]>([]);
  const [activity, setActivity] = useState<AdminAppointmentActivity | null>(null);
  const [doctors, setDoctors] = useState<DoctorVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activityRangePreset, setActivityRangePreset] =
    useState<ActivityRangePreset>("7d");
  const [customRangeStart, setCustomRangeStart] = useState("");
  const [customRangeEnd, setCustomRangeEnd] = useState("");
  const [visibleActivitySeries, setVisibleActivitySeries] = useState<
    Record<ActivitySeriesKey, boolean>
  >({
    pending: true,
    confirmed: true,
    completed: true,
    rejected: true,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TableStatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<TablePaymentFilter>("all");
  const [rowsPerPage, setRowsPerPage] = useState<5 | 10 | 20>(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setErrorMessage("");

        const [appointmentRows, appointmentStats, doctorRows] = await Promise.all([
          getAdminAppointmentsAnalytics(),
          getAdminAppointmentActivity(),
          getDoctorVerifications("all"),
        ]);

        setAppointments(Array.isArray(appointmentRows) ? appointmentRows : []);
        setActivity(appointmentStats);
        setDoctors(Array.isArray(doctorRows) ? doctorRows : []);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load doctor analytics."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadAnalytics();
  }, []);

  const doctorDirectory = useMemo(() => {
    return doctors.reduce<Record<string, DoctorVerification>>((accumulator, doctor) => {
      accumulator[doctor._id] = doctor;
      return accumulator;
    }, {});
  }, [doctors]);

  const totalTrackedRevenue = useMemo(() => {
    return appointments.reduce((sum, appointment) => {
      if (appointment.paymentStatus !== "paid") {
        return sum;
      }

      const doctor = doctorDirectory[appointment.doctorId];
      return sum + (Number(doctor?.consultationFee) || 0);
    }, 0);
  }, [appointments, doctorDirectory]);

  const pendingRevenue = useMemo(() => {
    return appointments.reduce((sum, appointment) => {
      if ((appointment.paymentStatus || "pending") !== "pending") {
        return sum;
      }

      const doctor = doctorDirectory[appointment.doctorId];
      return sum + (Number(doctor?.consultationFee) || 0);
    }, 0);
  }, [appointments, doctorDirectory]);

  const topDoctors = useMemo(() => {
    const totals = appointments.reduce<
      Record<
        string,
        {
          doctorId: string;
          doctorName: string;
          specialization: string;
          paidCount: number;
          totalBookings: number;
          revenue: number;
        }
      >
    >((accumulator, appointment) => {
      const doctor = doctorDirectory[appointment.doctorId];
      const fee = Number(doctor?.consultationFee) || 0;

      if (!accumulator[appointment.doctorId]) {
        accumulator[appointment.doctorId] = {
          doctorId: appointment.doctorId,
          doctorName: appointment.doctorName,
          specialization: appointment.specialization,
          paidCount: 0,
          totalBookings: 0,
          revenue: 0,
        };
      }

      accumulator[appointment.doctorId].totalBookings += 1;

      if (appointment.paymentStatus === "paid") {
        accumulator[appointment.doctorId].paidCount += 1;
        accumulator[appointment.doctorId].revenue += fee;
      }

      return accumulator;
    }, {});

    return Object.values(totals).sort((left, right) => right.revenue - left.revenue);
  }, [appointments, doctorDirectory]);

  const appointmentStatusCounts = useMemo(
    () => ({
      pending:
        activity?.pendingAppointments ||
        appointments.filter((appointment) => appointment.status === "pending").length,
      confirmed:
        activity?.confirmedAppointments ||
        appointments.filter((appointment) => appointment.status === "confirmed").length,
      completed:
        activity?.completedAppointments ||
        appointments.filter((appointment) => appointment.status === "completed").length,
      rejected:
        activity?.cancelledAppointments ||
        appointments.filter((appointment) => appointment.status === "cancelled").length,
    }),
    [activity, appointments]
  );

  const activityRangeSelection = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (activityRangePreset !== "custom") {
      const selectedOption = ACTIVITY_RANGE_OPTIONS.find(
        (option) => option.value === activityRangePreset
      );
      const days = selectedOption?.days ?? 7;
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (days - 1));

      return {
        label: selectedOption?.label ?? "7 days",
        days,
        startDate,
        endDate: today,
      };
    }

    const startDate = customRangeStart ? new Date(customRangeStart) : new Date(today);
    const endDate = customRangeEnd ? new Date(customRangeEnd) : new Date(today);

    if (Number.isNaN(startDate.getTime())) {
      startDate.setTime(today.getTime());
    }

    if (Number.isNaN(endDate.getTime())) {
      endDate.setTime(today.getTime());
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const normalizedStart =
      startDate.getTime() <= endDate.getTime() ? startDate : endDate;
    const normalizedEnd =
      startDate.getTime() <= endDate.getTime() ? endDate : startDate;
    const days =
      Math.max(
        1,
        Math.round(
          (normalizedEnd.getTime() - normalizedStart.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      );

    return {
      label:
        customRangeStart && customRangeEnd
          ? `${formatDate(customRangeStart)} to ${formatDate(customRangeEnd)}`
          : "Custom range",
      days,
      startDate: normalizedStart,
      endDate: normalizedEnd,
    };
  }, [activityRangePreset, customRangeEnd, customRangeStart]);

  const appointmentActivityData = useMemo(() => {
    const buckets = Array.from({ length: activityRangeSelection.days }, (_, index) => {
      const date = new Date(activityRangeSelection.startDate);
      date.setDate(activityRangeSelection.startDate.getDate() + index);

      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString("en-LK", {
          weekday: activityRangeSelection.days <= 7 ? "short" : undefined,
          month: "short",
          day: "numeric",
        }),
        totalCount: 0,
        pendingCount: 0,
        confirmedCount: 0,
        completedCount: 0,
        rejectedCount: 0,
      };
    });

    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    appointments.forEach((appointment) => {
      const key = getActivityDateKey(appointment);
      const bucket = bucketMap.get(key);

      if (!bucket) {
        return;
      }

      bucket.totalCount += 1;

      if (appointment.status === "pending") {
        bucket.pendingCount += 1;
      } else if (appointment.status === "confirmed") {
        bucket.confirmedCount += 1;
      } else if (appointment.status === "completed") {
        bucket.completedCount += 1;
      } else if (appointment.status === "cancelled") {
        bucket.rejectedCount += 1;
      }
    });

    const busiestDay = [...buckets].sort(
      (left, right) => right.totalCount - left.totalCount
    )[0];

    return {
      buckets,
      total: buckets.reduce((sum, bucket) => sum + bucket.totalCount, 0),
      busiestDay,
    };
  }, [activityRangeSelection, appointments]);

  const activeActivitySeries = useMemo(() => {
    const activeSeries = ACTIVITY_SERIES.filter(
      (series) => visibleActivitySeries[series.key]
    );

    return activeSeries.length > 0 ? activeSeries : ACTIVITY_SERIES;
  }, [visibleActivitySeries]);

  const appointmentTrendChart = useMemo(() => {
    const chartWidth =
      activityRangeSelection.days >= 30
        ? 1100
        : activityRangeSelection.days >= 14
          ? 860
          : 720;
    const chartHeight = 280;
    const padding = { top: 18, right: 20, bottom: 42, left: 20 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    const baselineY = padding.top + innerHeight;
    const maxVisibleCount = Math.max(
      ...appointmentActivityData.buckets.map((bucket) =>
        Math.max(
          visibleActivitySeries.pending ? bucket.pendingCount : 0,
          visibleActivitySeries.confirmed ? bucket.confirmedCount : 0,
          visibleActivitySeries.completed ? bucket.completedCount : 0,
          visibleActivitySeries.rejected ? bucket.rejectedCount : 0
        )
      ),
      0
    );
    const niceMax = Math.max(4, Math.ceil(maxVisibleCount / 4) * 4);

    const points = appointmentActivityData.buckets.map((bucket, index, list) => {
      const x =
        list.length === 1
          ? padding.left + innerWidth / 2
          : padding.left + (index / (list.length - 1)) * innerWidth;

      return {
        ...bucket,
        x,
        pendingY: baselineY - (bucket.pendingCount / niceMax) * innerHeight,
        confirmedY: baselineY - (bucket.confirmedCount / niceMax) * innerHeight,
        completedY: baselineY - (bucket.completedCount / niceMax) * innerHeight,
        rejectedY: baselineY - (bucket.rejectedCount / niceMax) * innerHeight,
      };
    });

    const yTicks = Array.from({ length: 5 }, (_, index) => {
      const value = niceMax - (niceMax / 4) * index;
      const y = padding.top + (innerHeight / 4) * index;

      return { value, y };
    });

    return {
      width: chartWidth,
      height: chartHeight,
      baselineY,
      points,
      yTicks,
      lineSeries: activeActivitySeries.map((series) => {
        const linePoints = points.map((point) => ({
          x: point.x,
          y:
            series.key === "pending"
              ? point.pendingY
              : series.key === "confirmed"
                ? point.confirmedY
                : series.key === "completed"
                  ? point.completedY
                  : point.rejectedY,
        }));

        return {
          ...series,
          points: linePoints,
          path: buildLinePath(linePoints),
          areaPath:
            series.key === activeActivitySeries[0]?.key
              ? buildAreaPath(linePoints, baselineY)
              : "",
        };
      }),
    };
  }, [
    activeActivitySeries,
    activityRangeSelection.days,
    appointmentActivityData.buckets,
    visibleActivitySeries,
  ]);

  const tableRows = useMemo(() => {
    return appointments
      .map((appointment) => {
        const doctor = doctorDirectory[appointment.doctorId];
        const amount = Number(doctor?.consultationFee) || 0;
        const analyticsDate = getActivityDateKey(appointment);

        return {
          ...appointment,
          amount,
          analyticsDate,
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

        const normalizedSearch = searchTerm.trim().toLowerCase();

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

  function toggleActivitySeries(seriesKey: ActivitySeriesKey) {
    setVisibleActivitySeries((current) => {
      const visibleCount = Object.values(current).filter(Boolean).length;

      if (current[seriesKey] && visibleCount === 1) {
        return current;
      }

      return {
        ...current,
        [seriesKey]: !current[seriesKey],
      };
    });
  }

  function handleExportCsv() {
    if (tableRows.length === 0) {
      setErrorMessage("No appointment records are available to export.");
      return;
    }

    const csvContent = [
      [
        "Doctor",
        "Specialization",
        "Appointment Date",
        "Appointment Time",
        "Booked On",
        "Payment",
        "Status",
        "Amount",
        "Reason",
      ],
      ...tableRows.map((row) => [
        row.doctorName,
        row.specialization,
        formatDate(row.appointmentDate),
        formatTime(row.appointmentTime),
        formatDate(row.analyticsDate),
        getPaymentLabel(row.paymentStatus),
        getStatusLabel(row.status),
        String(row.amount),
        (row.reason || "").replace(/\r?\n/g, " ").trim(),
      ]),
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    downloadBlob(
      new Blob([csvContent], { type: "text/csv;charset=utf-8;" }),
      "admin-doctor-analytics.csv"
    );
  }

  function handleExportPdf() {
    if (tableRows.length === 0) {
      setErrorMessage("No appointment records are available to export.");
      return;
    }
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
    });

    const reportTitle = "Doctor Analytics Report";
    const reportSubtitle =
      "Filtered appointment records and tracked doctor earnings snapshot.";
    const generatedOn = new Date().toLocaleString("en-LK");
    const lineHeight = 4.5;
    const tableLeft = 14;
    const tableWidth = 182;
    const columnWidths = [28, 21, 21, 17, 22, 18, 18, 21, 16];
    const columns = [
      "Doctor",
      "Specialty",
      "Date",
      "Time",
      "Booked On",
      "Payment",
      "Status",
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
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      columns.forEach((label, index) => {
        doc.text(label, x + 1.5, top + 6);
        x += columnWidths[index];
      });

      return top + 10;
    };

    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, 210, 30, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(reportTitle, 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(reportSubtitle, 14, 23);

    y = 40;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Generated on: ${generatedOn}`, 14, y);
    y += 8;
    doc.text(
      `Current filters: ${activityRangeSelection.label}, ${statusFilter}, ${paymentFilter}, ${tableRows.length} rows`,
      14,
      y
    );
    y += 10;

    const summaryLines = [
      `Total appointments: ${activity?.totalAppointments || appointments.length}`,
      `Pending: ${appointmentStatusCounts.pending}`,
      `Confirmed: ${appointmentStatusCounts.confirmed}`,
      `Completed: ${appointmentStatusCounts.completed}`,
      `Rejected: ${appointmentStatusCounts.rejected}`,
      `Tracked revenue: ${formatCurrency(totalTrackedRevenue)}`,
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    summaryLines.forEach((line) => {
      doc.text(line, 14, y);
      y += 6;
    });

    y += 6;
    y = drawTableHeader(y);

    tableRows.forEach((row, index) => {
      const rowValues = [
        row.doctorName,
        row.specialization,
        formatDate(row.appointmentDate),
        formatTime(row.appointmentTime),
        formatDate(row.analyticsDate),
        getPaymentLabel(row.paymentStatus),
        getStatusLabel(row.status),
        formatCurrency(row.amount),
        row.reason?.trim() || "-",
      ];
      const wrappedCells = rowValues.map((value, cellIndex) =>
        doc.splitTextToSize(String(value), columnWidths[cellIndex] - 3)
      );
      const rowHeight =
        Math.max(...wrappedCells.map((lines) => lines.length), 1) * lineHeight + 4;

      if (y + rowHeight > 282) {
        doc.addPage();
        y = 18;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`${reportTitle} (continued)`, 14, y);
        y += 10;
        y = drawTableHeader(y);
      }

      let x = tableLeft;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.rect(tableLeft, y, tableWidth, rowHeight, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      wrappedCells.forEach((lines, cellIndex) => {
        if (cellIndex > 0) {
          doc.line(x, y, x, y + rowHeight);
        }

        doc.text(lines, x + 1.5, y + 5);
        x += columnWidths[cellIndex];
      });

      if (index < tableRows.length - 1) {
        doc.line(tableLeft, y + rowHeight, tableLeft + tableWidth, y + rowHeight);
      }

      y += rowHeight;
    });

    doc.save("doctor-analytics-report.pdf");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-bold text-slate-800">Doctor Analytics</h2>
        <p className="mt-2 text-slate-600">
          Track appointment flow, compare doctor performance, and review revenue
          signals from one admin reporting space.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading doctor analytics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Total Appointments
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {activity?.totalAppointments || appointments.length}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Pending
              </p>
              <p className="mt-2 text-3xl font-bold text-amber-900">
                {appointmentStatusCounts.pending}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Confirmed
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-900">
                {appointmentStatusCounts.confirmed}
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Completed
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-900">
                {appointmentStatusCounts.completed}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                Tracked Revenue
              </p>
              <p className="mt-2 text-3xl font-bold text-rose-900">
                {formatCurrency(totalTrackedRevenue)}
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Appointment Trend
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Bookings over the selected range
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Daily booking volume split by appointment status.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-100 p-1">
                  {ACTIVITY_RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setActivityRangePreset(option.value)}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        activityRangePreset === option.value
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {activityRangePreset === "custom" ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-slate-600">
                    <span className="mb-2 block font-medium text-slate-700">From</span>
                    <input
                      type="date"
                      value={customRangeStart}
                      onChange={(event) => setCustomRangeStart(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />
                  </label>
                  <label className="text-sm text-slate-600">
                    <span className="mb-2 block font-medium text-slate-700">To</span>
                    <input
                      type="date"
                      value={customRangeEnd}
                      onChange={(event) => setCustomRangeEnd(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />
                  </label>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_SERIES.map((series) => {
                    const isActive = visibleActivitySeries[series.key];

                    return (
                      <button
                        key={series.key}
                        type="button"
                        onClick={() => toggleActivitySeries(series.key)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                          isActive
                            ? "border-slate-200 bg-white text-slate-800 shadow-sm"
                            : "border-slate-200 bg-slate-100 text-slate-400"
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: series.stroke }}
                        />
                        {series.label}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                  {activityRangeSelection.label}
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <div
                  className="min-w-[720px] rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.12),_transparent_40%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5"
                  style={{ width: `${appointmentTrendChart.width}px` }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-800">
                        Appointment activity
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Recent bookings are grouped by the day patients placed them.
                      </p>
                    </div>
                    <div className="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                      {activityRangeSelection.days} days selected
                    </div>
                  </div>

                  <svg
                    viewBox={`0 0 ${appointmentTrendChart.width} ${appointmentTrendChart.height}`}
                    className="mt-6 h-[320px] w-full"
                    role="img"
                    aria-label="Appointment activity chart"
                  >
                    {appointmentTrendChart.yTicks.map((tick) => (
                      <g key={tick.value}>
                        <line
                          x1="20"
                          x2={appointmentTrendChart.width - 20}
                          y1={tick.y}
                          y2={tick.y}
                          stroke="#dbeafe"
                          strokeDasharray="4 8"
                        />
                        <text x="0" y={tick.y + 4} fontSize="12" fill="#94a3b8">
                          {tick.value}
                        </text>
                      </g>
                    ))}

                    {appointmentTrendChart.lineSeries[0]?.areaPath ? (
                      <path
                        d={appointmentTrendChart.lineSeries[0].areaPath}
                        fill="url(#admin-activity-area)"
                        opacity="0.18"
                      />
                    ) : null}

                    <defs>
                      <linearGradient id="admin-activity-area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#ffffff" />
                      </linearGradient>
                    </defs>

                    {appointmentTrendChart.lineSeries.map((series) => (
                      <g key={series.key}>
                        <path
                          d={series.path}
                          fill="none"
                          stroke={series.stroke}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {series.points.map((point, index) => (
                          <g key={`${series.key}-${index}`}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="5.5"
                              fill="white"
                              stroke={series.stroke}
                              strokeWidth="3"
                            />
                            <circle cx={point.x} cy={point.y} r="2" fill={series.dot} />
                          </g>
                        ))}
                      </g>
                    ))}

                    {appointmentTrendChart.points.map((point) => (
                      <text
                        key={point.key}
                        x={point.x}
                        y={appointmentTrendChart.baselineY + 24}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#64748b"
                      >
                        {point.label}
                      </text>
                    ))}
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Range Summary
                </p>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Total bookings
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {appointmentActivityData.total}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Recorded between {formatDate(activityRangeSelection.startDate.toISOString())} and{" "}
                      {formatDate(activityRangeSelection.endDate.toISOString())}.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Busiest day
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {appointmentActivityData.busiestDay?.totalCount
                        ? appointmentActivityData.busiestDay.label
                        : "No peak day yet"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {appointmentActivityData.busiestDay?.totalCount
                        ? `${appointmentActivityData.busiestDay.totalCount} bookings were placed on the busiest day.`
                        : "Expand the range or wait for more activity to compare peaks."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Revenue watch
                    </p>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <span className="text-sm font-medium text-emerald-700">
                          Collected
                        </span>
                        <span className="text-sm font-bold text-emerald-800">
                          {formatCurrency(totalTrackedRevenue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <span className="text-sm font-medium text-amber-700">
                          Pending
                        </span>
                        <span className="text-sm font-bold text-amber-800">
                          {formatCurrency(pendingRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Top Doctors
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      Highest tracked earnings
                    </h3>
                  </div>
                  <div className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                    {topDoctors.length} doctors
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {topDoctors.slice(0, 5).map((doctor) => (
                    <div
                      key={doctor.doctorId}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {doctor.doctorName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {doctor.specialization}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-slate-900">
                          {formatCurrency(doctor.revenue)}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <span>{doctor.paidCount} paid</span>
                        <span>{doctor.totalBookings} total bookings</span>
                      </div>
                    </div>
                  ))}

                  {topDoctors.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No doctor earnings are available yet.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Appointment Records
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  Searchable analytics table
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Filter bookings, audit revenue-linked rows, and export the current
                  view when needed.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
                >
                  Export PDF
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 xl:grid-cols-[1.6fr_0.8fr_0.8fr_0.5fr]">
                <label className="text-sm text-slate-600">
                  <span className="mb-2 block font-medium text-slate-700">Search</span>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by doctor, specialty, date, time, reason, or payment"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                </label>

                <label className="text-sm text-slate-600">
                  <span className="mb-2 block font-medium text-slate-700">Status Filter</span>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as TableStatusFilter)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Rejected</option>
                  </select>
                </label>

                <label className="text-sm text-slate-600">
                  <span className="mb-2 block font-medium text-slate-700">Payment Filter</span>
                  <select
                    value={paymentFilter}
                    onChange={(event) =>
                      setPaymentFilter(event.target.value as TablePaymentFilter)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="all">All payments</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>

                <label className="text-sm text-slate-600">
                  <span className="mb-2 block font-medium text-slate-700">Rows</span>
                  <select
                    value={rowsPerPage}
                    onChange={(event) =>
                      setRowsPerPage(Number(event.target.value) as 5 | 10 | 20)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                <p>
                  Showing {pageStart} to {pageEnd} of {tableRows.length} records
                </p>
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-600">
                  {tableRows.filter((row) => row.paymentStatus === "paid").length} paid appointments
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-4 py-4">Doctor</th>
                      <th className="px-4 py-4">Specialty</th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Time</th>
                      <th className="px-4 py-4">Booked On</th>
                      <th className="px-4 py-4">Payment</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Amount</th>
                      <th className="px-4 py-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedRows.length > 0 ? (
                      paginatedRows.map((row) => (
                        <tr key={row._id} className="align-top">
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {row.doctorName}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              ID ending {row.doctorId.slice(-6)}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {row.specialization}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatDate(row.appointmentDate)}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatTime(row.appointmentTime)}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatDate(row.analyticsDate)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentClasses(
                                row.paymentStatus
                              )}`}
                            >
                              {getPaymentLabel(row.paymentStatus)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                row.status
                              )}`}
                            >
                              {getStatusLabel(row.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                            {formatCurrency(row.amount)}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {row.reason?.trim() || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          No appointments match the current search and filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm text-slate-500">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .slice(
                      Math.max(0, currentPage - 3),
                      Math.max(0, currentPage - 3) + 5
                    )
                    .map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`h-10 min-w-10 rounded-2xl px-3 text-sm font-semibold transition ${
                          currentPage === page
                            ? "bg-sky-600 text-white shadow-sm"
                            : "border border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
