import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/toastContext";
import {
  getCurrentDoctorProfile,
  updateCurrentDoctorProfile,
  type DoctorAvailabilityException,
  type DoctorAvailabilityScheduleItem,
  type DoctorProfile,
} from "../../services/doctorApi";
import {
  clearTelemedicineAuth,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";

type AvailabilityFormState = {
  acceptsNewAppointments: boolean;
  appointmentDurationMinutes: number;
  availabilitySchedule: DoctorAvailabilityScheduleItem[];
  availabilityExceptions: DoctorAvailabilityException[];
};

const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const DEFAULT_APPOINTMENT_DURATION_MINUTES = 15;
const APPOINTMENT_DURATION_OPTIONS = [10, 15, 20, 30];
const MIN_SLOT_DURATION_MINUTES = 120;
const MAX_SLOT_DURATION_MINUTES = 360;
const LAST_TIME_OPTION_MINUTES = 23 * 60 + 50;
const LATEST_START_TIME_MINUTES =
  LAST_TIME_OPTION_MINUTES - MIN_SLOT_DURATION_MINUTES;

function createEmptyScheduleSlot(): DoctorAvailabilityScheduleItem {
  return {
    day: "",
    startTime: "",
    endTime: "",
    mode: "video",
    maxAppointments: 1,
  };
}

function createEmptyAvailabilityException(): DoctorAvailabilityException {
  return {
    date: "",
    isBlocked: true,
    blockedTimeRanges: [],
    note: "",
  };
}

function createEmptyBlockedTimeRange() {
  return {
    startTime: "",
    endTime: "",
  };
}

function normalizeAppointmentDuration(value?: number) {
  return APPOINTMENT_DURATION_OPTIONS.includes(Number(value))
    ? Number(value)
    : DEFAULT_APPOINTMENT_DURATION_MINUTES;
}

function toMinutes(time: string) {
  const [hours, minutes] = String(time || "")
    .split(":")
    .map((part) => Number(part));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return NaN;
  }

  return hours * 60 + minutes;
}

function toTimeValue(totalMinutes: number) {
  const normalized = Math.max(0, Math.min(totalMinutes, LAST_TIME_OPTION_MINUTES));
  const hours = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minutes = String(normalized % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatTimeLabel(time: string) {
  const [rawHours, rawMinutes] = String(time || "")
    .split(":")
    .map((part) => Number(part));

  if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) {
    return time;
  }

  const period = rawHours >= 12 ? "PM" : "AM";
  const hours12 = rawHours % 12 === 0 ? 12 : rawHours % 12;
  const minutes = String(rawMinutes).padStart(2, "0");

  return `${hours12}:${minutes} ${period}`;
}

function buildTimeOptions(startMinutes: number, endMinutes: number) {
  const options: string[] = [];

  for (
    let minutes = startMinutes;
    minutes <= endMinutes;
    minutes += 10
  ) {
    options.push(toTimeValue(minutes));
  }

  return options;
}

function getMinimumEndTime(startTime: string) {
  const start = toMinutes(startTime);

  if (Number.isNaN(start)) {
    return "";
  }

  return toTimeValue(start + MIN_SLOT_DURATION_MINUTES);
}

function getMaximumEndTime(startTime: string) {
  const start = toMinutes(startTime);

  if (Number.isNaN(start)) {
    return "";
  }

  return toTimeValue(
    Math.min(start + MAX_SLOT_DURATION_MINUTES, LAST_TIME_OPTION_MINUTES)
  );
}

function normalizeSlotTimes(slot: DoctorAvailabilityScheduleItem) {
  const start = toMinutes(slot.startTime);
  const end = toMinutes(slot.endTime);

  if (Number.isNaN(start)) {
    return slot;
  }

  const minimumEndTime = getMinimumEndTime(slot.startTime);
  const maximumEndTime = getMaximumEndTime(slot.startTime);
  const minimumEnd = toMinutes(minimumEndTime);
  const maximumEnd = toMinutes(maximumEndTime);

  let nextEndTime = slot.endTime;

  if (
    !slot.endTime ||
    Number.isNaN(end) ||
    end < minimumEnd ||
    end > maximumEnd
  ) {
    nextEndTime = minimumEndTime;
  }

  return {
    ...slot,
    endTime: nextEndTime,
  };
}

function fieldClass(readOnly = false) {
  return `w-full rounded-2xl border px-4 py-3.5 outline-none transition ${
    readOnly
      ? "border-slate-200 bg-slate-100 text-slate-500"
      : "border-slate-200 bg-white text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
  }`;
}

function getCalculatedMaxAppointments(
  startTime: string,
  endTime: string,
  appointmentDurationMinutes: number
) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 1;
  }

  return Math.max(
    1,
    Math.floor((end - start) / appointmentDurationMinutes)
  );
}

function buildAvailabilitySummary(schedule: DoctorAvailabilityScheduleItem[]) {
  const completeSlots = schedule.filter(
    (slot) => slot.day && slot.startTime && slot.endTime
  );

  return {
    availableDays: [...new Set(completeSlots.map((slot) => slot.day))],
    availableTimeSlots: [
      ...new Set(
        completeSlots.map((slot) => `${slot.startTime}-${slot.endTime}`)
      ),
    ],
  };
}

function isCompleteScheduleSlot(slot: DoctorAvailabilityScheduleItem) {
  return Boolean(slot.day && slot.startTime && slot.endTime);
}

function getScheduleOverlapMessage(schedule: DoctorAvailabilityScheduleItem[]) {
  const groupedByDay = new Map<string, DoctorAvailabilityScheduleItem[]>();

  for (const slot of schedule) {
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);

    if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
      return `Invalid time range for ${slot.day || "selected day"}. End time must be later than start time.`;
    }

    if (end - start < MIN_SLOT_DURATION_MINUTES) {
      return `Invalid time range for ${slot.day || "selected day"}. Each slot must be at least 2 hours.`;
    }

    if (end - start > MAX_SLOT_DURATION_MINUTES) {
      return `Invalid time range for ${slot.day || "selected day"}. Each slot cannot exceed 6 hours.`;
    }

    const daySlots = groupedByDay.get(slot.day) || [];
    daySlots.push(slot);
    groupedByDay.set(slot.day, daySlots);
  }

  for (const [day, daySlots] of groupedByDay.entries()) {
    const sortedSlots = [...daySlots].sort(
      (left, right) => toMinutes(left.startTime) - toMinutes(right.startTime)
    );

    for (let index = 1; index < sortedSlots.length; index += 1) {
      const previous = sortedSlots[index - 1];
      const current = sortedSlots[index];

      if (toMinutes(current.startTime) < toMinutes(previous.endTime)) {
        return `${day} has overlapping time slots. Please adjust the times so they do not overlap.`;
      }
    }
  }

  return "";
}

function getAvailabilityExceptionsMessage(
  availabilityExceptions: DoctorAvailabilityException[]
) {
  const dateSet = new Set<string>();

  for (const exception of availabilityExceptions) {
    const date = String(exception.date || "").trim();

    if (!date) {
      return "Please choose a date for each blocked availability override.";
    }

    if (dateSet.has(date)) {
      return `You already added an override for ${date}. Keep one override per date.`;
    }

    dateSet.add(date);

    if (exception.isBlocked && exception.blockedTimeRanges.length > 0) {
      return `Choose either a full-day block or time-specific blocks for ${date}.`;
    }

    if (!exception.isBlocked && exception.blockedTimeRanges.length === 0) {
      return `Add at least one blocked time range for ${date}, or mark the whole day as unavailable.`;
    }

    const sortedRanges = [...exception.blockedTimeRanges].sort(
      (left, right) => toMinutes(left.startTime) - toMinutes(right.startTime)
    );

    for (let index = 0; index < sortedRanges.length; index += 1) {
      const range = sortedRanges[index];
      const start = toMinutes(range.startTime);
      const end = toMinutes(range.endTime);

      if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
        return `Invalid blocked time range for ${date}. End time must be later than start time.`;
      }

      if (index > 0 && start < toMinutes(sortedRanges[index - 1].endTime)) {
        return `Blocked time ranges overlap on ${date}. Please adjust them so they do not overlap.`;
      }
    }
  }

  return "";
}

function formatBlockedDate(value: string) {
  if (!value) {
    return "Select date";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-LK", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function mapProfileToAvailabilityForm(
  profile: DoctorProfile,
  fallbackAppointmentDurationMinutes?: number
): AvailabilityFormState {
  const availabilitySchedule = Array.isArray(profile.availabilitySchedule)
    ? profile.availabilitySchedule
    : [];
  const appointmentDurationMinutes = normalizeAppointmentDuration(
    profile.appointmentDurationMinutes ?? fallbackAppointmentDurationMinutes
  );

  return {
    acceptsNewAppointments: true,
    appointmentDurationMinutes,
    availabilityExceptions: Array.isArray(profile.availabilityExceptions)
      ? profile.availabilityExceptions.map((exception) => ({
          date: exception.date || "",
          isBlocked: exception.isBlocked !== false,
          blockedTimeRanges: Array.isArray(exception.blockedTimeRanges)
            ? exception.blockedTimeRanges.map((range) => ({
                startTime: range.startTime || "",
                endTime: range.endTime || "",
              }))
            : [],
          note: exception.note || "",
        }))
      : [],
    availabilitySchedule:
      availabilitySchedule.length > 0
        ? availabilitySchedule.map((slot) => ({
            ...slot,
            maxAppointments: getCalculatedMaxAppointments(
              slot.startTime,
              slot.endTime,
              appointmentDurationMinutes
            ),
          }))
        : [],
  };
}

function buildAvailabilityPayload(
  _profile: DoctorProfile,
  formData: AvailabilityFormState
) {
  const filteredSchedule = formData.availabilitySchedule.filter(
    (slot) => slot.day && slot.startTime && slot.endTime
  );
  const normalizedSchedule = filteredSchedule.map((slot) => ({
    ...slot,
    mode: "video" as const,
    maxAppointments: getCalculatedMaxAppointments(
      slot.startTime,
      slot.endTime,
      formData.appointmentDurationMinutes
    ),
  }));
  const summary = buildAvailabilitySummary(normalizedSchedule);

  return {
    appointmentDurationMinutes: formData.appointmentDurationMinutes,
    acceptsNewAppointments: true,
    availableDays: summary.availableDays,
    availableTimeSlots: summary.availableTimeSlots,
    availabilitySchedule: normalizedSchedule,
    availabilityExceptions: formData.availabilityExceptions
      .map((exception) => ({
        date: String(exception.date || "").trim(),
        isBlocked: exception.isBlocked !== false,
        blockedTimeRanges: Array.isArray(exception.blockedTimeRanges)
          ? exception.blockedTimeRanges
              .map((range) => ({
                startTime: String(range.startTime || "").trim(),
                endTime: String(range.endTime || "").trim(),
              }))
              .filter((range) => range.startTime && range.endTime)
          : [],
        note: String(exception.note || "").trim(),
      }))
      .filter(
        (exception) =>
          exception.date &&
          (exception.isBlocked || exception.blockedTimeRanges.length > 0)
      ),
  };
}

export default function DoctorAvailabilityPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const auth = getStoredTelemedicineAuth();
  const token = auth.token || "";

  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [formData, setFormData] = useState<AvailabilityFormState>({
    acceptsNewAppointments: true,
    appointmentDurationMinutes: DEFAULT_APPOINTMENT_DURATION_MINUTES,
    availabilitySchedule: [],
    availabilityExceptions: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const savedAppointmentDurationMinutes = normalizeAppointmentDuration(
    doctorProfile?.appointmentDurationMinutes
  );

  const availabilitySummary = useMemo(
    () => buildAvailabilitySummary(formData.availabilitySchedule),
    [formData.availabilitySchedule]
  );

  const startTimeOptions = useMemo(
    () => buildTimeOptions(0, LATEST_START_TIME_MINUTES),
    []
  );

  const configuredSlotCount = useMemo(
    () => formData.availabilitySchedule.filter(isCompleteScheduleSlot).length,
    [formData.availabilitySchedule]
  );

  const scheduleSummary = useMemo(
    () =>
      formData.availabilitySchedule
        .filter((slot) => slot.day && slot.startTime && slot.endTime)
        .map((slot) => {
          return `${slot.day} - ${slot.startTime}-${slot.endTime}`;
        }),
    [formData.availabilitySchedule]
  );

  const scheduleGroups = useMemo(() => {
    const groups = new Map<
      string,
      Array<{ slot: DoctorAvailabilityScheduleItem; index: number }>
    >();

    formData.availabilitySchedule.forEach((slot, index) => {
      const groupKey = slot.day || "Unassigned";
      const currentGroup = groups.get(groupKey) || [];
      currentGroup.push({ slot, index });
      groups.set(groupKey, currentGroup);
    });

    return Array.from(groups.entries()).map(([day, items]) => ({
      day,
      items,
    }));
  }, [formData.availabilitySchedule]);

  useEffect(() => {
    async function loadProfile() {
      if (!token) {
        setErrorMessage("Please login first.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");
        const profile = await getCurrentDoctorProfile(token);
        setDoctorProfile(profile);
        setFormData(mapProfileToAvailabilityForm(profile));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load availability";

        if (
          message.toLowerCase().includes("unauthorized") ||
          message.toLowerCase().includes("invalid token")
        ) {
          clearTelemedicineAuth();
          navigate("/login", { replace: true });
          return;
        }

        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [navigate, token]);

  const persistAvailability = async (
    nextFormData: AvailabilityFormState,
    options?: {
      successMessage?: string;
      closeEditingRow?: boolean;
    }
  ) => {
    if (!doctorProfile) {
      setErrorMessage("Doctor profile is not loaded yet.");
      return false;
    }

    const filteredSchedule = nextFormData.availabilitySchedule.filter(
      isCompleteScheduleSlot
    );
    const overlapMessage = getScheduleOverlapMessage(filteredSchedule);

    if (overlapMessage) {
      setErrorMessage(overlapMessage);
      showToast(overlapMessage, "error");
      return false;
    }

    const exceptionsMessage = getAvailabilityExceptionsMessage(
      nextFormData.availabilityExceptions
    );

    if (exceptionsMessage) {
      setErrorMessage(exceptionsMessage);
      showToast(exceptionsMessage, "error");
      return false;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const updatedProfile = await updateCurrentDoctorProfile(
        token,
        buildAvailabilityPayload(doctorProfile, {
          ...nextFormData,
          availabilitySchedule: filteredSchedule,
        })
      );
      const normalizedUpdatedProfile = {
        ...updatedProfile,
        appointmentDurationMinutes:
          updatedProfile.appointmentDurationMinutes ??
          nextFormData.appointmentDurationMinutes,
      };

      setDoctorProfile(normalizedUpdatedProfile);
      setFormData(
        mapProfileToAvailabilityForm(
          normalizedUpdatedProfile,
          nextFormData.appointmentDurationMinutes
        )
      );

      if (options?.successMessage) {
        setSuccessMessage(options.successMessage);
        showToast(options.successMessage, "success");
      }

      if (options?.closeEditingRow !== false) {
        setEditingRowKey(null);
      }

      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update availability";
      setErrorMessage(message);
      showToast(message, "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleChange = (
    index: number,
    field: keyof DoctorAvailabilityScheduleItem,
    value: string
  ) => {
    setFormData((prev) => {
      return {
        ...prev,
        availabilitySchedule: prev.availabilitySchedule.map((slot, slotIndex) =>
          slotIndex === index
            ? (() => {
                const draftSlot = {
                  ...slot,
                  [field]: value,
                };
                const nextSlot =
                  field === "startTime" || field === "endTime"
                    ? normalizeSlotTimes(draftSlot)
                    : draftSlot;

                return {
                  ...nextSlot,
                  maxAppointments: getCalculatedMaxAppointments(
                    nextSlot.startTime,
                    nextSlot.endTime,
                    prev.appointmentDurationMinutes
                  ),
                };
              })()
            : slot
        ),
      };
    });
  };

  const getEndTimeOptions = (startTime: string) => {
    const start = toMinutes(startTime);

    if (Number.isNaN(start)) {
      return [];
    }

    const minimumEnd = toMinutes(getMinimumEndTime(startTime));
    const maximumEnd = toMinutes(getMaximumEndTime(startTime));

    return buildTimeOptions(minimumEnd, maximumEnd);
  };

  const handleAppointmentDurationChange = (value: number) => {
    const nextDuration = normalizeAppointmentDuration(value);
    setFormData((prev) => ({
      ...prev,
      appointmentDurationMinutes: nextDuration,
      availabilitySchedule: prev.availabilitySchedule.map((slot) => ({
        ...slot,
        maxAppointments: getCalculatedMaxAppointments(
          slot.startTime,
          slot.endTime,
          nextDuration
        ),
      })),
    }));
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleSaveAppointmentDuration = async () => {
    if (!doctorProfile) {
      setErrorMessage("Doctor profile is not loaded yet.");
      return;
    }

    try {
      setSaving(true);
      setSuccessMessage("");
      setErrorMessage("");

      const profileBackedFormData = mapProfileToAvailabilityForm(
        {
          ...doctorProfile,
          appointmentDurationMinutes: formData.appointmentDurationMinutes,
        },
        formData.appointmentDurationMinutes
      );

      const updatedProfile = await updateCurrentDoctorProfile(
        token,
        buildAvailabilityPayload(doctorProfile, profileBackedFormData)
      );

      const normalizedUpdatedProfile = {
        ...updatedProfile,
        appointmentDurationMinutes:
          updatedProfile.appointmentDurationMinutes ??
          formData.appointmentDurationMinutes,
      };

      setDoctorProfile(normalizedUpdatedProfile);
      setFormData((prev) => ({
        ...prev,
        appointmentDurationMinutes:
          normalizedUpdatedProfile.appointmentDurationMinutes,
        availabilitySchedule: prev.availabilitySchedule.map((slot) => ({
          ...slot,
          maxAppointments: getCalculatedMaxAppointments(
            slot.startTime,
            slot.endTime,
            normalizedUpdatedProfile.appointmentDurationMinutes
          ),
        })),
      }));
      setSuccessMessage("Appointment duration updated successfully.");
      showToast("Appointment duration updated successfully.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update appointment duration";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRow = (index: number) => {
    const nextRow = formData.availabilitySchedule[index];
    const isNewDraft = !doctorProfile?.availabilitySchedule?.[index];

    if (!nextRow || !isCompleteScheduleSlot(nextRow)) {
      const message = "Please complete day, start time, and end time before updating.";
      setErrorMessage(message);
      showToast(message, "error");
      return;
    }

    void persistAvailability(formData, {
      successMessage: isNewDraft
        ? "Availability slot added successfully."
        : "Availability updated successfully.",
    });
  };

  const addScheduleRow = () => {
    setSuccessMessage("");
    setFormData((prev) => {
      const nextSchedule = [...prev.availabilitySchedule, createEmptyScheduleSlot()];
      setEditingRowKey(`row-${nextSchedule.length - 1}`);

      return {
        ...prev,
        availabilitySchedule: nextSchedule,
      };
    });
  };

  const removeScheduleRow = (index: number) => {
    const nextFormData = {
      ...formData,
      availabilitySchedule: formData.availabilitySchedule.filter(
        (_, slotIndex) => slotIndex !== index
      ),
    };

    setFormData(nextFormData);
    void persistAvailability(nextFormData, {
      successMessage: "Session deleted successfully.",
    });
  };

  const handleAvailabilityExceptionChange = (
    index: number,
    field: keyof DoctorAvailabilityException,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      availabilityExceptions: prev.availabilityExceptions.map(
        (exception, exceptionIndex) =>
          exceptionIndex === index
            ? {
                ...exception,
                [field]: value,
                blockedTimeRanges:
                  field === "isBlocked" && value
                    ? []
                    : exception.blockedTimeRanges,
              }
            : exception
      ),
    }));
  };

  const handleBlockedTimeRangeChange = (
    exceptionIndex: number,
    rangeIndex: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      availabilityExceptions: prev.availabilityExceptions.map(
        (exception, currentExceptionIndex) =>
          currentExceptionIndex === exceptionIndex
            ? {
                ...exception,
                blockedTimeRanges: exception.blockedTimeRanges.map((range, currentRangeIndex) =>
                  currentRangeIndex === rangeIndex
                    ? {
                        ...range,
                        [field]: value,
                      }
                    : range
                ),
              }
            : exception
      ),
    }));
  };

  const addAvailabilityException = () => {
    setSuccessMessage("");
    setFormData((prev) => ({
      ...prev,
      availabilityExceptions: [
        ...prev.availabilityExceptions,
        createEmptyAvailabilityException(),
      ],
    }));
  };

  const removeAvailabilityException = (index: number) => {
    const nextFormData = {
      ...formData,
      availabilityExceptions: formData.availabilityExceptions.filter(
        (_, exceptionIndex) => exceptionIndex !== index
      ),
    };

    setFormData(nextFormData);
    void persistAvailability(nextFormData, {
      successMessage: "Blocked date deleted successfully.",
      closeEditingRow: false,
    });
  };

  const addBlockedTimeRange = (exceptionIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      availabilityExceptions: prev.availabilityExceptions.map(
        (exception, currentExceptionIndex) =>
          currentExceptionIndex === exceptionIndex
            ? {
                ...exception,
                isBlocked: false,
                blockedTimeRanges: [
                  ...exception.blockedTimeRanges,
                  createEmptyBlockedTimeRange(),
                ],
              }
            : exception
      ),
    }));
  };

  const removeBlockedTimeRange = (exceptionIndex: number, rangeIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      availabilityExceptions: prev.availabilityExceptions.map(
        (exception, currentExceptionIndex) =>
          currentExceptionIndex === exceptionIndex
            ? {
                ...exception,
                blockedTimeRanges: exception.blockedTimeRanges.filter(
                  (_, currentRangeIndex) => currentRangeIndex !== rangeIndex
                ),
              }
            : exception
      ),
    }));
  };

  const handleSaveAvailabilityExceptions = () => {
    void persistAvailability(formData, {
      successMessage: "Blocked dates updated successfully.",
      closeEditingRow: false,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-lg font-semibold text-slate-700">
          Loading availability...
        </p>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Manage Booking Schedule
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Set your available days, consultation hours, and block specific dates when you're unavailable.
          </p>
        </div>

        {/* Stats Cards Section */}
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-md transition hover:shadow-lg hover:scale-105">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Doctor</p>
                <p className="mt-3 text-lg font-bold text-blue-900">
                  {doctorProfile?.fullName || "Doctor"}
                </p>
                <p className="mt-1 text-sm text-blue-700">
                  {doctorProfile?.specialization || "Specialization not set"}
                </p>
              </div>
              <div className="rounded-full bg-blue-200 p-1.5 text-xl flex-shrink-0">👨‍⚕️</div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 shadow-md transition hover:shadow-lg hover:scale-105">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Available Days</p>
                <p className="mt-3 text-4xl font-bold text-emerald-900">
                  {availabilitySummary.availableDays.length}
                </p>
                <p className="mt-1 text-sm text-emerald-700">Weekly booking days</p>
              </div>
              <div className="rounded-full bg-emerald-200 p-1.5 text-xl flex-shrink-0">📅</div>
            </div>
          </div>

          <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-purple-100 p-6 shadow-md transition hover:shadow-lg hover:scale-105">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Sessions</p>
                <p className="mt-3 text-4xl font-bold text-purple-900">
                  {scheduleSummary.length}
                </p>
                <p className="mt-1 text-sm text-purple-700">Active time blocks</p>
              </div>
              <div className="rounded-full bg-purple-200 p-1.5 text-xl flex-shrink-0">⏱️</div>
            </div>
          </div>

          <div className="rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-orange-100 p-6 shadow-md transition hover:shadow-lg hover:scale-105">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Duration</p>
                <p className="mt-3 text-4xl font-bold text-orange-900">
                  {formData.appointmentDurationMinutes}
                </p>
                <p className="mt-1 text-sm text-orange-700">Minutes per booking</p>
              </div>
              <div className="rounded-full bg-orange-200 p-1.5 text-xl flex-shrink-0">⏲️</div>
            </div>
          </div>
        </section>

        <main className="space-y-6">
          {/* Sessions Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            {/* Section Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Weekly Sessions</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Configure your working hours for each day of the week.
                </p>
              </div>
              <button
                type="button"
                onClick={addScheduleRow}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                + Add slot
              </button>
            </div>

            {/* Appointment Duration Settings */}
            <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50">
              <label className="block text-sm font-semibold text-slate-900 mb-3">
                Appointment Duration
              </label>
              <div className="flex items-end gap-3 flex-wrap">
                <select
                  value={formData.appointmentDurationMinutes}
                  onChange={(event) =>
                    handleAppointmentDurationChange(Number(event.target.value))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">90 minutes</option>
                  <option value="120">2 hours</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleSaveAppointmentDuration()}
                  disabled={
                    saving ||
                    formData.appointmentDurationMinutes ===
                      savedAppointmentDurationMinutes
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
                >
                  Save Duration
                </button>
              </div>
            </div>

            {/* Sessions List */}
            <div className="space-y-4">
                  {formData.availabilitySchedule.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No sessions added yet.
                    </div>
                  )}

                  {formData.availabilitySchedule.length > 0 && (
                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Session List
                          </p>
                          <p className="text-xs text-slate-500">
                            {configuredSlotCount} slot
                            {configuredSlotCount === 1 ? "" : "s"} configured
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 bg-slate-50 p-4">
                        {scheduleGroups.map((group) => (
                          <div
                            key={group.day}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {group.day}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {group.items.length} session
                                  {group.items.length === 1 ? "" : "s"}
                                </p>
                              </div>
                            </div>

                            <div className="hidden grid-cols-[72px_160px_minmax(240px,1fr)_180px] gap-4 border-b border-slate-200 bg-white px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 md:grid">
                              <span className="text-center">Session</span>
                              <span className="text-center">Day</span>
                              <span className="text-center">Time Range</span>
                              <span className="text-center">Action</span>
                            </div>

                            <div className="divide-y divide-slate-200">
                              {group.items.map(({ slot, index }, groupIndex) => (
                                <div
                                  key={`${group.day}-${index}`}
                                  className="px-4 py-4"
                                >
                                  {(() => {
                                    const isEditing = editingRowKey === `row-${index}`;
                                    const isComplete = isCompleteScheduleSlot(slot);
                                    const isNewDraft = isEditing && !isComplete;

                                    return (
                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[72px_160px_minmax(240px,1fr)_180px] md:items-center">
                                    <div className="md:flex md:justify-center">
                                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 md:hidden">
                                        Session
                                      </label>
                                      <span className="inline-flex min-w-[72px] justify-center rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                                        {groupIndex + 1}
                                      </span>
                                    </div>

                                    <div className="md:flex md:justify-center">
                                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 md:hidden">
                                        Day
                                      </label>
                                      <select
                                        value={slot.day}
                                        onChange={(event) =>
                                          handleScheduleChange(
                                            index,
                                            "day",
                                            event.target.value
                                          )
                                        }
                                        disabled={editingRowKey !== `row-${index}`}
                                        className={fieldClass()}
                                      >
                                        <option value="">Select day</option>
                                        {DAY_OPTIONS.map((day) => (
                                          <option key={day} value={day}>
                                            {day}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="md:flex md:justify-center">
                                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 md:hidden">
                                        Time Range
                                      </label>
                                      <div className="grid min-w-[260px] grid-cols-2 gap-3">
                                        <select
                                          value={slot.startTime}
                                          onChange={(event) =>
                                            handleScheduleChange(
                                              index,
                                              "startTime",
                                              event.target.value
                                            )
                                          }
                                          disabled={editingRowKey !== `row-${index}`}
                                          className={fieldClass()}
                                        >
                                          <option value="">Select start</option>
                                          {startTimeOptions.map((time) => (
                                            <option key={time} value={time}>
                                              {formatTimeLabel(time)}
                                            </option>
                                          ))}
                                        </select>
                                        <select
                                          value={slot.endTime}
                                          onChange={(event) =>
                                            handleScheduleChange(
                                              index,
                                              "endTime",
                                              event.target.value
                                            )
                                          }
                                          disabled={
                                            editingRowKey !== `row-${index}` ||
                                            !slot.startTime
                                          }
                                          className={fieldClass()}
                                        >
                                          <option value="">
                                            {slot.startTime ? "Select end" : "Choose start first"}
                                          </option>
                                          {getEndTimeOptions(slot.startTime).map((time) => (
                                            <option key={time} value={time}>
                                              {formatTimeLabel(time)}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    <div className="md:flex md:justify-center">
                                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 md:hidden">
                                        Remove
                                      </label>
                                      <div className="flex items-center gap-2">
                                        {isEditing ? (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateRow(index)}
                                              disabled={saving}
                                              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-70"
                                              title={isNewDraft ? "Save new session" : "Update session"}
                                              aria-label={
                                                isNewDraft
                                                  ? `Save new session for ${group.day}`
                                                  : `Update session ${groupIndex + 1} for ${group.day}`
                                              }
                                            >
                                              <svg
                                                className="h-5 w-5"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                aria-hidden="true"
                                              >
                                                <path
                                                  fillRule="evenodd"
                                                  d="M16.704 5.29a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0l-3.1-3.1a.75.75 0 111.06-1.06l2.57 2.569 6.72-6.72a.75.75 0 011.06 0z"
                                                  clipRule="evenodd"
                                                />
                                              </svg>
                                            </button>
                                            {!isNewDraft && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingRowKey(null);
                                                  if (doctorProfile) {
                                                    setFormData(
                                                      mapProfileToAvailabilityForm(doctorProfile)
                                                    );
                                                  }
                                                }}
                                                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
                                                title="Cancel"
                                                aria-label={`Cancel editing session ${groupIndex + 1} for ${group.day}`}
                                              >
                                                <svg
                                                  className="h-5 w-5"
                                                  viewBox="0 0 20 20"
                                                  fill="currentColor"
                                                  aria-hidden="true"
                                                >
                                                  <path
                                                    fillRule="evenodd"
                                                    d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z"
                                                    clipRule="evenodd"
                                                  />
                                                </svg>
                                              </button>
                                            )}
                                          </>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSuccessMessage("");
                                              setEditingRowKey(`row-${index}`);
                                            }}
                                            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                                            aria-label={`Edit session ${groupIndex + 1} for ${group.day}`}
                                            title="Edit"
                                          >
                                            <svg
                                              className="h-5 w-5"
                                              viewBox="0 0 20 20"
                                              fill="currentColor"
                                              aria-hidden="true"
                                            >
                                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-8.9 8.9a2 2 0 01-.878.497l-2.96.845a.75.75 0 01-.928-.928l.845-2.96a2 2 0 01.497-.878l8.9-8.9zM12.525 5.707L4.925 13.307a.5.5 0 00-.124.22l-.51 1.784 1.784-.51a.5.5 0 00.22-.124l7.6-7.6-1.37-1.37z" />
                                            </svg>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => removeScheduleRow(index)}
                                          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                                          aria-label={`Remove session ${groupIndex + 1} for ${group.day}`}
                                          title="Remove"
                                        >
                                          <svg
                                            className="h-5 w-5"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            aria-hidden="true"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M8.75 2.5a1.25 1.25 0 00-1.179.833L7.21 4.25H4.5a.75.75 0 000 1.5h.568l.7 9.092A2.25 2.25 0 008.012 17h3.976a2.25 2.25 0 002.244-2.158l.7-9.092h.568a.75.75 0 000-1.5H12.79l-.361-.917A1.25 1.25 0 0011.25 2.5h-2.5zm2.28 1.75l.296.75H8.674l.296-.75h2.06zM8.5 8a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0V8zm3 .75A.75.75 0 0010.75 8v5a.75.75 0 001.5 0V8.75z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                    );
                                  })()}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
            </div>
          </div>

          {/* Overrides Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            {/* Section Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Block Specific Dates</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Block days or times when you're unavailable for appointments.
                </p>
              </div>
              <button
                type="button"
                onClick={addAvailabilityException}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                + Add blocked date
              </button>
            </div>

            {/* Blocked Dates List */}
            <div className="space-y-4">
              {formData.availabilityExceptions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No blocked dates added yet. Patients can book any date that matches your weekly schedule.
                </div>
              ) : (
                formData.availabilityExceptions.map((exception, exceptionIndex) => (
                  <div
                    key={`availability-exception-${exceptionIndex}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                      <div className="space-y-3">
                        <label className="block text-sm text-slate-700">
                          <span className="mb-2 block font-semibold">Date</span>
                          <input
                            type="date"
                            value={exception.date}
                            onChange={(event) =>
                              handleAvailabilityExceptionChange(
                                exceptionIndex,
                                "date",
                                event.target.value
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                          <span className="mt-2 block text-xs text-slate-500">
                            {formatBlockedDate(exception.date)}
                          </span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAvailabilityException(exceptionIndex)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition h-fit"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
                        <input
                          type="checkbox"
                          checked={exception.isBlocked}
                          onChange={(event) =>
                            handleAvailabilityExceptionChange(
                              exceptionIndex,
                              "isBlocked",
                              event.target.checked
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Block the entire day
                      </label>
                      <p className="mt-2 text-xs text-slate-600">
                        {exception.isBlocked
                          ? "Patients cannot book on this date."
                          : "You can block specific time ranges."}
                      </p>
                    </div>

                    {!exception.isBlocked && (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-900">Block Time Ranges</p>
                        {exception.blockedTimeRanges.map((range, rangeIndex) => (
                          <div
                            key={`blocked-time-range-${exceptionIndex}-${rangeIndex}`}
                            className="flex gap-2 items-end"
                          >
                            <select
                              value={range.startTime}
                              onChange={(event) =>
                                handleBlockedTimeRangeChange(
                                  exceptionIndex,
                                  rangeIndex,
                                  "startTime",
                                  event.target.value
                                )
                              }
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="">From</option>
                              {startTimeOptions.map((time) => (
                                <option key={`${time}-block-start`} value={time}>
                                  {formatTimeLabel(time)}
                                </option>
                              ))}
                            </select>

                            <select
                              value={range.endTime}
                              onChange={(event) =>
                                handleBlockedTimeRangeChange(
                                  exceptionIndex,
                                  rangeIndex,
                                  "endTime",
                                  event.target.value
                                )
                              }
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="">To</option>
                              {getEndTimeOptions(range.startTime).map((time) => (
                                <option key={`${time}-block-end`} value={time}>
                                  {formatTimeLabel(time)}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                removeBlockedTimeRange(exceptionIndex, rangeIndex)
                              }
                              className="rounded-lg bg-rose-100 p-2 text-rose-600 hover:bg-rose-200 transition"
                              title="Remove time range"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() =>
                            addBlockedTimeRange(exceptionIndex)
                          }
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                        >
                          + Add time range
                        </button>
                      </div>
                    )}

                    <label className="mt-4 block text-sm text-slate-700">
                      <span className="mb-2 block font-semibold">Note (Optional)</span>
                      <textarea
                        value={exception.note || ""}
                        onChange={(event) =>
                          handleAvailabilityExceptionChange(
                            exceptionIndex,
                            "note",
                            event.target.value
                          )
                        }
                        rows={3}
                        placeholder="E.g., Conference, Surgery, Personal leave"
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                ))
              )}
            </div>

            {formData.availabilityExceptions.length > 0 ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAvailabilityExceptions}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
                >
                  Save blocked dates
                </button>
              </div>
            ) : null}
          </div>

          {saving && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Saving availability changes...
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          {errorMessage && !loading && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
