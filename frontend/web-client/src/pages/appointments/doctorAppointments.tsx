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
type ActivityRangePreset = "3d" | "7d" | "14d" | "30d" | "90d" | "custom";
type ActivitySeriesKey = "pending" | "confirmed" | "completed" | "rejected";
type PaymentFilter = "all" | "pending" | "paid" | "failed";
type ScheduleFilter = "all" | "today" | "upcoming" | "past";

const ACTIVITY_RANGE_OPTIONS: Array<{
  value: ActivityRangePreset;
  label: string;
  days?: number;
}> = [
  { value: "3d", label: "Past 3 days", days: 3 },
  { value: "7d", label: "Past 7 days", days: 7 },
  { value: "14d", label: "Past 14 days", days: 14 },
  { value: "30d", label: "Past 30 days", days: 30 },
  { value: "90d", label: "Past 90 days", days: 90 },
  { value: "custom", label: "Custom range" },
];

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

function getAppointmentActivityDateKey(appointment: Appointment) {
  if (appointment.createdAt) {
    const createdAt = new Date(appointment.createdAt);

    if (!Number.isNaN(createdAt.getTime())) {
      return createdAt.toISOString().slice(0, 10);
    }
  }

  return appointment.appointmentDate;
}

function formatRelativeTime(targetDate: Date) {
  const now = new Date();
  const diffMilliseconds = targetDate.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMilliseconds / (1000 * 60));

  if (diffMinutes <= 0) {
    return "starting soon";
  }

  if (diffMinutes < 60) {
    return `in ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"}`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
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

function buildSmoothLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points.reduce(
    (path, point, index) =>
      `${path}${index === 0 ? "M" : " L"} ${point.x} ${point.y}`,
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

  const linePath = buildSmoothLinePath(points);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;
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
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
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
        const normalizedAppointments = Array.isArray(nextAppointments)
          ? nextAppointments
          : [];
        setAppointments(normalizedAppointments);

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
              const patient = await getPatientSummaryByAuthUserId(
                token,
                patientId
              );
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

  const filteredAppointments = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return appointments
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
    paymentFilter,
    scheduleFilter,
    searchTerm,
    statusFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [paymentFilter, rowsPerPage, scheduleFilter, searchTerm, statusFilter]);

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

  const nextAppointment = useMemo(() => {
    const now = new Date();

    return appointments
      .filter(
        (appointment) =>
          ["pending", "confirmed"].includes(appointment.status) &&
          getAppointmentDateTimeValue(appointment).getTime() >= now.getTime()
      )
      .sort(
        (left, right) =>
          getAppointmentDateTimeValue(left).getTime() -
          getAppointmentDateTimeValue(right).getTime()
      )[0];
  }, [appointments]);

  const upcomingAppointmentsCount = useMemo(() => {
    const now = new Date();

    return appointments.filter((appointment) => {
      const appointmentDate = getAppointmentDateTimeValue(appointment);
      return (
        ["pending", "confirmed"].includes(appointment.status) &&
        appointmentDate.getTime() >= now.getTime()
      );
    }).length;
  }, [appointments]);

  const statusChartData = useMemo(() => {
    const chartItems = [
      {
        label: "Pending",
        value: summaryCounts.pending,
        barClassName: "bg-amber-400",
      },
      {
        label: "Confirmed",
        value: summaryCounts.confirmed,
        barClassName: "bg-emerald-500",
      },
      {
        label: "Completed",
        value: summaryCounts.completed,
        barClassName: "bg-blue-500",
      },
      {
        label: "Rejected",
        value: summaryCounts.cancelled,
        barClassName: "bg-rose-500",
      },
    ];

    const maxValue = Math.max(...chartItems.map((item) => item.value), 1);

    return chartItems.map((item) => ({
      ...item,
      percentage: (item.value / maxValue) * 100,
    }));
  }, [summaryCounts]);

  const activityRangeSelection = useMemo(() => {
    const selectedOption = ACTIVITY_RANGE_OPTIONS.find(
      (option) => option.value === activityRangePreset
    );

    if (activityRangePreset !== "custom") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endDate = new Date(today);
      const days = selectedOption?.days ?? 7;
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (days - 1));

      return {
        label: selectedOption?.label ?? "Past 7 days",
        days,
        startDate,
        endDate,
        isCustom: false,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parsedStart = customRangeStart ? new Date(customRangeStart) : new Date(today);
    const parsedEnd = customRangeEnd ? new Date(customRangeEnd) : new Date(today);

    if (Number.isNaN(parsedStart.getTime())) {
      parsedStart.setTime(today.getTime());
    }

    if (Number.isNaN(parsedEnd.getTime())) {
      parsedEnd.setTime(today.getTime());
    }

    parsedStart.setHours(0, 0, 0, 0);
    parsedEnd.setHours(0, 0, 0, 0);

    const startDate =
      parsedStart.getTime() <= parsedEnd.getTime() ? parsedStart : parsedEnd;
    const endDate =
      parsedStart.getTime() <= parsedEnd.getTime() ? parsedEnd : parsedStart;
    const days =
      Math.max(
        1,
        Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) +
          1
      );

    return {
      label:
        customRangeStart && customRangeEnd
          ? `${formatDate(customRangeStart)} to ${formatDate(customRangeEnd)}`
          : "Custom range",
      days,
      startDate,
      endDate,
      isCustom: true,
    };
  }, [activityRangePreset, customRangeEnd, customRangeStart]);

  const appointmentActivityData = useMemo(() => {
    const buckets = Array.from(
      { length: activityRangeSelection.days },
      (_, index) => {
        const date = new Date(activityRangeSelection.startDate);
        date.setDate(activityRangeSelection.startDate.getDate() + index);

        return {
          key: date.toISOString().slice(0, 10),
          label: date.toLocaleDateString("en-LK", {
            weekday: activityRangeSelection.days <= 7 ? "short" : undefined,
            month: "short",
            day: "numeric",
          }),
          shortLabel: date.toLocaleDateString("en-LK", {
            day: "numeric",
          }),
          totalCount: 0,
          pendingCount: 0,
          confirmedCount: 0,
          completedCount: 0,
          rejectedCount: 0,
        };
      }
    );

    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    appointments.forEach((appointment) => {
      const bucket = bucketMap.get(getAppointmentActivityDateKey(appointment));

      if (bucket) {
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
      }
    });

    const maxCount = Math.max(
      ...buckets.map((bucket) =>
        Math.max(
          bucket.pendingCount,
          bucket.confirmedCount,
          bucket.completedCount,
          bucket.rejectedCount
        )
      ),
      1
    );
    const busiestDay = [...buckets].sort(
      (left, right) => right.totalCount - left.totalCount
    )[0];

    const series = [
      {
        key: "pending",
        label: "Pending",
        stroke: "#f59e0b",
        dot: "#fbbf24",
      },
      {
        key: "confirmed",
        label: "Confirmed",
        stroke: "#10b981",
        dot: "#34d399",
      },
      {
        key: "completed",
        label: "Completed",
        stroke: "#2563eb",
        dot: "#60a5fa",
      },
      {
        key: "rejected",
        label: "Rejected",
        stroke: "#f43f5e",
        dot: "#fb7185",
      },
    ] as const;

    return {
      maxCount,
      total: buckets.reduce((sum, bucket) => sum + bucket.totalCount, 0),
      busiestDay,
      series,
      buckets: buckets.map((bucket) => ({
        ...bucket,
        pendingPercentage: (bucket.pendingCount / maxCount) * 100,
        confirmedPercentage: (bucket.confirmedCount / maxCount) * 100,
        completedPercentage: (bucket.completedCount / maxCount) * 100,
        rejectedPercentage: (bucket.rejectedCount / maxCount) * 100,
      })),
    };
  }, [activityRangeSelection, appointments]);

  const activeActivitySeries = useMemo(() => {
    const visibleSeries = appointmentActivityData.series.filter(
      (series) => visibleActivitySeries[series.key]
    );

    return visibleSeries.length > 0 ? visibleSeries : appointmentActivityData.series;
  }, [appointmentActivityData.series, visibleActivitySeries]);

  const appointmentTrendChart = useMemo(() => {
    const chartWidth =
      activityRangeSelection.days >= 60
        ? 1600
        : activityRangeSelection.days >= 30
          ? 1180
          : activityRangeSelection.days >= 14
            ? 860
            : 720;
    const chartHeight = 260;
    const padding = { top: 18, right: 20, bottom: 42, left: 20 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    const baselineY = padding.top + innerHeight;
    const niceMax = Math.max(
      4,
      Math.ceil(
        Math.max(
          ...appointmentActivityData.buckets.map((bucket) =>
            Math.max(
              visibleActivitySeries.pending ? bucket.pendingCount : 0,
              visibleActivitySeries.confirmed ? bucket.confirmedCount : 0,
              visibleActivitySeries.completed ? bucket.completedCount : 0,
              visibleActivitySeries.rejected ? bucket.rejectedCount : 0
            )
          ),
          0
        ) / 4
      ) * 4
    );

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

      return {
        value,
        y,
      };
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
          path: buildSmoothLinePath(linePoints),
          areaPath: buildAreaPath(linePoints, baselineY),
        };
      }),
    };
  }, [
    activeActivitySeries,
    activityRangeSelection.days,
    appointmentActivityData.buckets,
    visibleActivitySeries,
  ]);

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
      setActionLoadingId(appointmentId);
      setErrorMessage("");

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
              }
            : appointment
        )
      );

      if (status === "cancelled") {
        setRejectingAppointmentId(null);
        setRejectReason("");
      }

      showToast(
        data.message ||
          (status === "confirmed"
            ? "Appointment accepted successfully."
            : "Appointment rejected successfully."),
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
      setPatientDetailsLoadingId(appointment.patientId);
      setErrorMessage("");

      const patientDetails = await getPatientDetailsByAuthUserId(
        auth.token,
        appointment.patientId
      );
      setSelectedPatientDetails(patientDetails);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load patient details."
      );
    } finally {
      setPatientDetailsLoadingId(null);
    }
  }

  function handleToggleActivitySeries(seriesKey: ActivitySeriesKey) {
    setVisibleActivitySeries((currentState) => {
      const nextState = {
        ...currentState,
        [seriesKey]: !currentState[seriesKey],
      };

      const hasVisibleSeries = Object.values(nextState).some(Boolean);
      return hasVisibleSeries
        ? nextState
        : {
            ...currentState,
            [seriesKey]: true,
          };
    });
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
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Doctor Appointments
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

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] p-6 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
              Next Up
            </p>
            {nextAppointment ? (
              <>
                <h2 className="mt-3 text-2xl font-bold">
                  Your next appointment is {formatRelativeTime(getAppointmentDateTimeValue(nextAppointment))}
                </h2>
                <p className="mt-3 text-sm leading-6 text-blue-100">
                  {getPatientDisplayName(
                    nextAppointment,
                    patientsById[nextAppointment.patientId]
                  )} on {formatDate(nextAppointment.appointmentDate)} at{" "}
                  {formatTime(nextAppointment.appointmentTime)}.
                </p>
                <div className="mt-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                  {upcomingAppointmentsCount} upcoming appointment
                  {upcomingAppointmentsCount === 1 ? "" : "s"} in your queue
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-2xl font-bold">
                  No upcoming appointments right now
                </h2>
                <p className="mt-3 text-sm leading-6 text-blue-100">
                  Your queue is clear. New requests and confirmations will appear
                  here as they are scheduled.
                </p>
              </>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Status Overview
            </p>
            <div className="mt-5 space-y-4">
              {statusChartData.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="text-slate-500">{item.value}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100">
                    <div
                      className={`h-2.5 rounded-full transition-all ${item.barClassName}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Appointment Trend
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                {activityRangeSelection.isCustom
                  ? `Bookings from ${activityRangeSelection.label}`
                  : `Bookings over ${activityRangeSelection.label.toLowerCase()}`}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Time Range
                </label>
                <select
                  value={activityRangePreset}
                  onChange={(event) =>
                    setActivityRangePreset(event.target.value as ActivityRangePreset)
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {ACTIVITY_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {activityRangePreset === "custom" ? (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      From
                    </label>
                    <input
                      type="date"
                      value={customRangeStart}
                      onChange={(event) => setCustomRangeStart(event.target.value)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      To
                    </label>
                    <input
                      type="date"
                      value={customRangeEnd}
                      onChange={(event) => setCustomRangeEnd(event.target.value)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Appointment activity
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Daily booking volume split by appointment status.
                  </p>
                </div>
                <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  {activityRangeSelection.isCustom
                    ? `${activityRangeSelection.days} days selected`
                    : activityRangeSelection.label}
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-3">
                {appointmentActivityData.series.map((series) => (
                  <button
                    key={series.key}
                    type="button"
                    onClick={() => handleToggleActivitySeries(series.key)}
                    aria-pressed={visibleActivitySeries[series.key]}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      visibleActivitySeries[series.key]
                        ? "border-slate-200 bg-white text-slate-700 shadow-sm"
                        : "border-slate-200 bg-slate-100 text-slate-400"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: visibleActivitySeries[series.key]
                          ? series.stroke
                          : "#cbd5e1",
                      }}
                    />
                    {series.label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto pb-2">
                <svg
                  viewBox={`0 0 ${appointmentTrendChart.width} ${appointmentTrendChart.height}`}
                  className="h-[280px] min-w-[720px] w-full"
                  role="img"
                  aria-label={`Appointment trend for ${activityRangeSelection.label}`}
                >
                  <defs>
                    {appointmentTrendChart.lineSeries.map((series) => (
                      <linearGradient
                        key={`${series.key}-area`}
                        id={`appointmentTrendArea-${series.key}`}
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={series.stroke} stopOpacity="0.12" />
                        <stop offset="100%" stopColor={series.stroke} stopOpacity="0" />
                      </linearGradient>
                    ))}
                  </defs>

                  {appointmentTrendChart.yTicks.map((tick) => (
                    <g key={tick.value}>
                      <line
                        x1="20"
                        x2={appointmentTrendChart.width - 20}
                        y1={tick.y}
                        y2={tick.y}
                        stroke="#dbeafe"
                        strokeDasharray="5 7"
                      />
                      <text
                        x="0"
                        y={tick.y + 4}
                        fontSize="11"
                        fill="#94a3b8"
                      >
                        {tick.value}
                      </text>
                    </g>
                  ))}

                  {appointmentTrendChart.lineSeries.map((series) => (
                    <g key={series.key}>
                      <path
                        d={series.areaPath}
                        fill={`url(#appointmentTrendArea-${series.key})`}
                      />
                      <path
                        d={series.path}
                        fill="none"
                        stroke={series.stroke}
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </g>
                  ))}

                  {appointmentTrendChart.lineSeries.map((series) =>
                    appointmentTrendChart.points.map((point) => {
                      const yValue =
                        series.key === "pending"
                          ? point.pendingY
                          : series.key === "confirmed"
                            ? point.confirmedY
                            : series.key === "completed"
                              ? point.completedY
                              : point.rejectedY;
                      const countValue =
                        series.key === "pending"
                          ? point.pendingCount
                          : series.key === "confirmed"
                            ? point.confirmedCount
                            : series.key === "completed"
                              ? point.completedCount
                              : point.rejectedCount;

                      return (
                        <g key={`${series.key}-${point.key}`}>
                          <circle
                            cx={point.x}
                            cy={yValue}
                            r="4.5"
                            fill="#ffffff"
                            stroke={series.stroke}
                            strokeWidth="2.5"
                          />
                          {countValue > 0 ? (
                            <circle
                              cx={point.x}
                              cy={yValue}
                              r="2"
                              fill={series.dot}
                            />
                          ) : null}
                        </g>
                      );
                    })
                  )}

                  {appointmentTrendChart.points.map((point, index) =>
                    activityRangeSelection.days <= 14 ||
                    index === 0 ||
                    index === appointmentTrendChart.points.length - 1 ||
                    index %
                      (activityRangeSelection.days >= 60
                        ? 8
                        : activityRangeSelection.days >= 30
                          ? 4
                          : 2) ===
                      0 ? (
                      <text
                        key={`label-${point.key}`}
                        x={point.x}
                        y={appointmentTrendChart.baselineY + 22}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#64748b"
                      >
                        {activityRangeSelection.days >= 30
                          ? point.shortLabel
                          : point.label}
                      </text>
                    ) : null
                  )}
                </svg>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Total Bookings
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {appointmentActivityData.total}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Bookings created during the selected time window.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Busiest Day
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {appointmentActivityData.busiestDay?.label || "No data"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {appointmentActivityData.busiestDay?.totalCount
                    ? `${appointmentActivityData.busiestDay.totalCount} appointment${
                        appointmentActivityData.busiestDay.totalCount === 1 ? "" : "s"
                      } were created on this day.`
                    : "No appointments were created during this period."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  Range summary
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use the day toggle to compare the doctor&apos;s short-term and
                  monthly booking pattern without leaving this page.
                </p>
              </div>
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

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.6fr]">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by patient, issue, date, time, or rejection reason"
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
                Payment Filter
              </label>
              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value as PaymentFilter)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">All payments</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
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
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-4">Patient</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Time</th>
                    <th className="px-4 py-4">Issue</th>
                    <th className="px-4 py-4">Payment</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Reject Reason</th>
                    <th className="px-4 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedAppointments.map((appointment) => {
                    const patient = patientsById[appointment.patientId];
                    const patientName = getPatientDisplayName(appointment, patient);
                    const rejectReason = getLatestCancelledReason(appointment);
                    const isPending = appointment.status === "pending";
                    const isActionLoading = actionLoadingId === appointment._id;

                    return (
                      <tr key={appointment._id} className="align-top">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">{patientName}</p>
                            {patient?.age !== undefined && patient?.age !== null ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {patient.age} years old
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {formatDate(appointment.appointmentDate)}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {formatTime(appointment.appointmentTime)}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {appointment.reason?.trim() || "No reason provided"}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {getPaymentLabel(appointment.paymentStatus)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(
                              appointment.status
                            )}`}
                          >
                            {getStatusLabel(appointment.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {rejectReason || "-"}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedAppointmentDetails(appointment)}
                              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                              View Appointment
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleOpenPatientDetails(appointment)}
                              disabled={patientDetailsLoadingId === appointment.patientId}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {patientDetailsLoadingId === appointment.patientId
                                ? "Loading..."
                                : "View Details"}
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
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Reject
                              </button>
                              </>
                            ) : (
                              <span className="text-sm text-slate-400">No status actions</span>
                            )}
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
                onClick={() =>
                  void handleUpdateAppointmentStatus(
                    rejectingAppointmentId,
                    "cancelled",
                    rejectReason.trim()
                  )
                }
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
                  {[selectedPatientDetails.title, selectedPatientDetails.firstName, selectedPatientDetails.lastName]
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
                  Review the full appointment information, including the patient’s
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
