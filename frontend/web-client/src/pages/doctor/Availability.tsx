import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/ToastProvider";
import {
  getCurrentDoctorProfile,
  updateCurrentDoctorProfile,
  type DoctorAvailabilityScheduleItem,
  type DoctorProfile,
} from "../../services/doctorApi";
import {
  clearTelemedicineAuth,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";

type AvailabilityFormState = {
  isAvailableForVideo: boolean;
  supportsDigitalPrescriptions: boolean;
  acceptsNewAppointments: boolean;
  availabilitySchedule: DoctorAvailabilityScheduleItem[];
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
const CONSULTATION_DURATION_MINUTES = 10;
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
    minutes += CONSULTATION_DURATION_MINUTES
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

function getCalculatedMaxAppointments(startTime: string, endTime: string) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 1;
  }

  return Math.max(
    1,
    Math.floor((end - start) / CONSULTATION_DURATION_MINUTES)
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

function mapProfileToAvailabilityForm(
  profile: DoctorProfile
): AvailabilityFormState {
  const availabilitySchedule = Array.isArray(profile.availabilitySchedule)
    ? profile.availabilitySchedule
    : [];

  return {
    isAvailableForVideo: Boolean(profile.isAvailableForVideo),
    supportsDigitalPrescriptions: profile.supportsDigitalPrescriptions !== false,
    acceptsNewAppointments: profile.acceptsNewAppointments !== false,
    availabilitySchedule:
      availabilitySchedule.length > 0
        ? availabilitySchedule.map((slot) => ({
            ...slot,
            maxAppointments: getCalculatedMaxAppointments(
              slot.startTime,
              slot.endTime
            ),
          }))
        : [],
  };
}

function buildAvailabilityPayload(
  profile: DoctorProfile,
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
      slot.endTime
    ),
  }));
  const summary = buildAvailabilitySummary(normalizedSchedule);

  return {
    fullName: profile.fullName || "",
    email: profile.email || "",
    phone: profile.phone || "",
    specialization: profile.specialization || "",
    experience: Number(profile.experience) || 0,
    qualification: profile.qualification || "",
    licenseNumber: profile.licenseNumber || "",
    hospitalName: profile.hospitalName || "",
    hospitalAddress: profile.hospitalAddress || "",
    city: profile.city || "",
    consultationFee: Number(profile.consultationFee) || 0,
    profileImage: profile.profileImage || "",
    about: profile.about || "",
    isAvailableForVideo: formData.isAvailableForVideo,
    supportsDigitalPrescriptions: formData.supportsDigitalPrescriptions,
    acceptsNewAppointments: formData.acceptsNewAppointments,
    availableDays: summary.availableDays,
    availableTimeSlots: summary.availableTimeSlots,
    availabilitySchedule: normalizedSchedule,
  };
}

export default function DoctorAvailabilityPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const auth = getStoredTelemedicineAuth();
  const token = auth.token || "";

  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [formData, setFormData] = useState<AvailabilityFormState>({
    isAvailableForVideo: false,
    supportsDigitalPrescriptions: true,
    acceptsNewAppointments: true,
    availabilitySchedule: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);

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

  const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    const nextFormData = { ...formData, [name]: checked };
    setFormData(nextFormData);
    void persistAvailability(nextFormData, {
      successMessage: "Availability updated successfully.",
    });
  };

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

      setDoctorProfile(updatedProfile);
      setFormData(mapProfileToAvailabilityForm(updatedProfile));

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
                    nextSlot.endTime
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
      successMessage: "Availability slot deleted successfully.",
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_#f8fafc_42%,_#eef2ff)] px-4 py-10">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <section className="bg-[linear-gradient(160deg,_#1d4ed8,_#2563eb_50%,_#0f172a_140%)] px-8 py-10 text-white md:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-100">
            Availability
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">
            Manage Booking Schedule
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-blue-100/95">
            Set the days, time ranges, and booking options patients can reserve.
            This page is the doctor menu home for availability management.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-blue-100">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
              {doctorProfile?.fullName || "Doctor"}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
              {doctorProfile?.specialization || "Specialization not set"}
            </span>
          </div>
        </section>

        <section className="space-y-6 p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Available Days
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {availabilitySummary.availableDays.length > 0
                  ? availabilitySummary.availableDays.join(", ")
                  : "Not configured"}
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Time Slots
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                            {scheduleSummary.length > 0
                  ? `${scheduleSummary.length} session${scheduleSummary.length === 1 ? "" : "s"}`
                  : "No sessions yet"}
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Booking Status
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    formData.isAvailableForVideo
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  Video {formData.isAvailableForVideo ? "On" : "Off"}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    formData.supportsDigitalPrescriptions
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  Prescriptions {formData.supportsDigitalPrescriptions ? "On" : "Off"}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    formData.acceptsNewAppointments
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {formData.acceptsNewAppointments ? "Accepting Appointments" : "Paused"}
                </span>
              </div>
            </div>
          </div>

          <main>
            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
                      Schedule
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      Configure Availability
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={addScheduleRow}
                    className="rounded-2xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    Add slot
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {formData.availabilitySchedule.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No detailed schedule added yet.
                    </div>
                  )}

                  {formData.availabilitySchedule.length > 0 && (
                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Schedule List
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

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 md:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
                  Preferences
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  Booking Options
                </h2>

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="flex min-h-20 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="isAvailableForVideo"
                      checked={formData.isAvailableForVideo}
                      onChange={handleToggleChange}
                      disabled={saving}
                      className="mt-1 shrink-0"
                    />
                    <span className="leading-6">
                      Available for video sessions
                    </span>
                  </label>

                  <label className="flex min-h-20 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="supportsDigitalPrescriptions"
                      checked={formData.supportsDigitalPrescriptions}
                      onChange={handleToggleChange}
                      disabled={saving}
                      className="mt-1 shrink-0"
                    />
                    <span className="leading-6">
                      Support digital prescriptions
                    </span>
                  </label>

                  <label className="flex min-h-20 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="acceptsNewAppointments"
                      checked={formData.acceptsNewAppointments}
                      onChange={handleToggleChange}
                      disabled={saving}
                      className="mt-1 shrink-0"
                    />
                    <span className="leading-6">Accept new appointments</span>
                  </label>
                </div>
              </div>

              {saving && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Saving availability changes...
                </div>
              )}
            </div>

            {successMessage && (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            {errorMessage && !loading && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
          </main>
        </section>
      </div>
    </div>
  );
}
