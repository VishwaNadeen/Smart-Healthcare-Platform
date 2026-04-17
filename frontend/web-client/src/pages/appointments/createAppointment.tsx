import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createAppointment,
  getDoctorAvailableSlots,
  getPatientAppointments,
  type Appointment,
  type AppointmentAvailabilitySlot,
  type CreateAppointmentPayload,
} from "../../services/appointmentApi";
import {
  getDoctors,
  getDoctorSpecialties,
  type DoctorProfileResponse,
  type DoctorSpecialty,
} from "../../services/doctorApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

type AppointmentFormState = {
  specialization: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  paymentStatus: "paid" | "pending" | "failed";
};

const initialFormState: AppointmentFormState = {
  specialization: "",
  doctorId: "",
  doctorName: "",
  appointmentDate: "",
  appointmentTime: "",
  reason: "",
  paymentStatus: "pending",
};

function getDoctorLabel(doctor: DoctorProfileResponse) {
  const hospital = doctor.hospitalName?.trim();
  return hospital
    ? `${doctor.fullName} - ${hospital}`
    : doctor.fullName;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekdayFromDateValue(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateParts(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return {
      weekday: value,
      monthDay: "",
    };
  }

  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    monthDay: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  };
}

function getDoctorScheduleWeekdays(doctor: DoctorProfileResponse | null) {
  if (!doctor) {
    return [];
  }

  if (Array.isArray(doctor.availabilitySchedule) && doctor.availabilitySchedule.length > 0) {
    return [...new Set(doctor.availabilitySchedule.map((slot) => slot.day).filter(Boolean))];
  }

  return Array.isArray(doctor.availableDays)
    ? doctor.availableDays.filter(Boolean)
    : [];
}

function buildUpcomingAvailableDates(
  doctor: DoctorProfileResponse | null,
  lookAheadDays = 30
) {
  const availableWeekdays = getDoctorScheduleWeekdays(doctor);

  if (availableWeekdays.length === 0) {
    return [];
  }

  const options: Array<{ value: string; label: string }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < lookAheadDays; offset += 1) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + offset);
    const dateValue = toDateValue(nextDate);
    const weekday = getWeekdayFromDateValue(dateValue);
    const blockedDate = Array.isArray(doctor?.availabilityExceptions)
      ? doctor.availabilityExceptions.find(
          (exception) => exception.date === dateValue && exception.isBlocked
        )
      : null;

    if (availableWeekdays.includes(weekday) && !blockedDate) {
      options.push({
        value: dateValue,
        label: formatDateLabel(dateValue),
      });
    }
  }

  return options;
}

export default function CreateAppointmentPage() {
  const navigate = useNavigate();
  const auth = getStoredTelemedicineAuth();

  const [formData, setFormData] = useState<AppointmentFormState>(initialFormState);
  const [specialties, setSpecialties] = useState<DoctorSpecialty[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfileResponse[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [availableSlots, setAvailableSlots] = useState<AppointmentAvailabilitySlot[]>(
    []
  );
  const [slotInfoMessage, setSlotInfoMessage] = useState("");
  const [showAllAvailableDates, setShowAllAvailableDates] = useState(false);
  const [bookedAppointments, setBookedAppointments] = useState<Appointment[]>([]);

  const selectedDoctor =
    doctors.find((doctor) => doctor._id === formData.doctorId) || null;
  const availableDateOptions = buildUpcomingAvailableDates(selectedDoctor);
  const visibleDateOptions = showAllAvailableDates
    ? availableDateOptions
    : availableDateOptions.slice(0, 8);

  const bookedTimesOnSelectedDate = useMemo(() => {
    if (!formData.appointmentDate) return new Set<string>();
    return new Set(
      bookedAppointments
        .filter((a) => a.appointmentDate === formData.appointmentDate)
        .map((a) => a.appointmentTime)
    );
  }, [bookedAppointments, formData.appointmentDate]);

  useEffect(() => {
    async function loadSpecialties() {
      try {
        setLoadingSpecialties(true);
        setErrorMessage("");

        const data = await getDoctorSpecialties();
        const activeSpecialties = (Array.isArray(data) ? data : []).filter(
          (specialty) => specialty.isActive !== false
        );

        setSpecialties(activeSpecialties);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load specializations."
        );
      } finally {
        setLoadingSpecialties(false);
      }
    }

    loadSpecialties();
  }, []);

  useEffect(() => {
    if (!auth.token || !formData.doctorId) {
      setBookedAppointments([]);
      return;
    }

    getPatientAppointments(auth.token)
      .then((all) => {
        setBookedAppointments(
          all.filter(
            (a) =>
              a.doctorId === formData.doctorId &&
              (a.status === "pending" || a.status === "confirmed")
          )
        );
      })
      .catch(() => setBookedAppointments([]));
  }, [auth.token, formData.doctorId]);

  useEffect(() => {
    async function loadDoctorsForSpecialization() {
      if (!formData.specialization) {
        setDoctors([]);
        return;
      }

      try {
        setLoadingDoctors(true);
        setErrorMessage("");

        const data = await getDoctors({
          specialization: formData.specialization,
          acceptsNewAppointments: true,
        });

        setDoctors(
          (Array.isArray(data) ? data : []).filter(
            (doctor) => doctor.verificationStatus === "approved"
          )
        );
      } catch (error: unknown) {
        setDoctors([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load doctors."
        );
      } finally {
        setLoadingDoctors(false);
      }
    }

    loadDoctorsForSpecialization();
  }, [formData.specialization]);

  function updateField<K extends keyof AppointmentFormState>(
    key: K,
    value: AppointmentFormState[K]
  ) {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSpecializationChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const nextSpecialization = event.target.value;


      setFormData((current) => ({
        ...current,
        specialization: nextSpecialization,
        doctorId: "",
        doctorName: "",
        appointmentDate: "",
        appointmentTime: "",
      }));
      setAvailableSlots([]);
      setSlotInfoMessage("");
      setShowAllAvailableDates(false);
  }

  function handleDoctorChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextDoctorId = event.target.value;
    const doctor = doctors.find((item) => item._id === nextDoctorId) || null;

    setFormData((current) => ({
      ...current,
      doctorId: nextDoctorId,
      doctorName: doctor?.fullName || "",
      appointmentDate: "",
      appointmentTime: "",
    }));
    setAvailableSlots([]);
    setSlotInfoMessage("");
    setShowAllAvailableDates(false);
  }

  function handleAppointmentDateSelect(value: string) {
    setFormData((current) => ({
      ...current,
      appointmentDate: value,
      appointmentTime: "",
    }));
  }

  useEffect(() => {
    async function loadAvailableSlots() {
      if (!auth.token || !formData.doctorId || !formData.appointmentDate) {
        setAvailableSlots([]);
        setSlotInfoMessage("");
        return;
      }

      const weekday = getWeekdayFromDateValue(formData.appointmentDate);
      const allowedWeekdays = getDoctorScheduleWeekdays(selectedDoctor);

      if (!allowedWeekdays.includes(weekday)) {
        setAvailableSlots([]);
        setSlotInfoMessage("This doctor is not available on the selected day.");
        setFormData((current) => ({
          ...current,
          appointmentTime: "",
        }));
        return;
      }

      try {
        setLoadingSlots(true);
        setErrorMessage("");
        setSlotInfoMessage("");

        const response = await getDoctorAvailableSlots(auth.token, {
          doctorId: formData.doctorId,
          appointmentDate: formData.appointmentDate,
        });

        setAvailableSlots(response.availableSlots);
        setFormData((current) => ({
          ...current,
          appointmentTime: response.availableSlots.some(
            (slot) => slot.time === current.appointmentTime
          )
            ? current.appointmentTime
            : "",
        }));

        if (response.availableSlots.length === 0) {
          setSlotInfoMessage(
            "No appointment times are available for the selected date. Please choose another day."
          );
        }
      } catch (error: unknown) {
        setAvailableSlots([]);
        setSlotInfoMessage("");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load available appointment times."
        );
      } finally {
        setLoadingSlots(false);
      }
    }

    void loadAvailableSlots();
  }, [auth.token, formData.appointmentDate, formData.doctorId, selectedDoctor]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth.token) {
      setErrorMessage("Please sign in as a patient to create an appointment.");
      return;
    }

    if (!formData.specialization || !formData.doctorId || !formData.doctorName) {
      setErrorMessage("Select a specialization and doctor before submitting.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");


      const payload: CreateAppointmentPayload = {
        doctorId: formData.doctorId,
        doctorName: formData.doctorName,
        specialization: formData.specialization,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        reason: formData.reason,
        paymentStatus: formData.paymentStatus,
      };

      const response = await createAppointment(auth.token, payload);

      navigate("/payment/checkout", {
        state: {
          appointmentId: response.appointment._id,
          doctorId: formData.doctorId,
          doctorName: formData.doctorName,
          specialization: formData.specialization,
          amount: selectedDoctor?.consultationFee ?? 0,
          appointmentDate: formData.appointmentDate,
          appointmentTime: formData.appointmentTime,
        },
      });
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create appointment."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">

        {/* Page header */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-6 text-center sm:px-8">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Book an Appointment
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Follow the steps below to schedule your consultation.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Step 1 — Doctor Selection */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                1
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-600">
                Select Doctor
              </h2>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Specialization
                </label>
                <select
                  value={formData.specialization}
                  onChange={handleSpecializationChange}
                  disabled={loadingSpecialties}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
                  required
                >
                  <option value="">
                    {loadingSpecialties ? "Loading specializations..." : "Select specialization"}
                  </option>
                  {specialties.map((specialty) => (
                    <option key={specialty._id} value={specialty.name}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Doctor
                </label>
                <select
                  value={formData.doctorId}
                  onChange={handleDoctorChange}
                  disabled={!formData.specialization || loadingDoctors}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
                  required
                >
                  <option value="">
                    {!formData.specialization
                      ? "Select specialization first"
                      : loadingDoctors
                        ? "Loading doctors..."
                        : doctors.length === 0
                          ? "No doctors found"
                          : "Select doctor"}
                  </option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {getDoctorLabel(doctor)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 2 — Schedule */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                2
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-600">
                Pick a Date & Time
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              {/* Date picker */}
              <div className="p-6">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Appointment Date
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {!formData.doctorId ? (
                    <p className="text-sm text-slate-400">
                      Select a doctor first to see available dates.
                    </p>
                  ) : availableDateOptions.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      This doctor has no bookable dates configured yet.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                        {visibleDateOptions.map((dateOption) => {
                          const isSelected = formData.appointmentDate === dateOption.value;
                          const parts = formatDateParts(dateOption.value);
                          return (
                            <button
                              key={dateOption.value}
                              type="button"
                              onClick={() => handleAppointmentDateSelect(dateOption.value)}
                              className={`rounded-xl border px-3 py-3 text-left transition ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                              }`}
                            >
                              <p className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? "text-blue-200" : "text-slate-400"}`}>
                                {parts.weekday}
                              </p>
                              <p className="mt-1 text-sm font-semibold leading-tight">
                                {parts.monthDay}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {availableDateOptions.length > 8 ? (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                          <p className="text-xs text-slate-500">
                            {showAllAvailableDates
                              ? `All ${availableDateOptions.length} dates shown`
                              : `Showing next ${visibleDateOptions.length} dates`}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowAllAvailableDates((c) => !c)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                          >
                            {showAllAvailableDates ? "Show fewer" : "Show more"}
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
                {selectedDoctor && availableDateOptions.length > 0 ? (
                  <p className="mt-2 text-xs text-slate-400">
                    Available on {getDoctorScheduleWeekdays(selectedDoctor).join(", ")}.
                  </p>
                ) : null}
              </div>

              {/* Time picker */}
              <div className="p-6">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Appointment Time
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {!formData.appointmentDate ? (
                    <p className="text-sm text-slate-400">
                      Choose a date first to see available time slots.
                    </p>
                  ) : loadingSlots ? (
                    <p className="text-sm text-slate-400">Loading available times...</p>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No appointment times are available for this date.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {availableSlots.map((slot) => {
                        const isSelected = formData.appointmentTime === slot.time;
                        const isBooked = bookedTimesOnSelectedDate.has(slot.time);
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={isBooked}
                            onClick={() => !isBooked && updateField("appointmentTime", slot.time)}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                              isBooked
                                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60"
                                : isSelected
                                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                            }`}
                          >
                            <span className="block">{slot.label}</span>
                            {isBooked && (
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-rose-400">
                                Booked
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {slotInfoMessage ? (
                  <p className="mt-2 text-xs text-amber-600">{slotInfoMessage}</p>
                ) : selectedDoctor?.appointmentDurationMinutes ? (
                  <p className="mt-2 text-xs text-slate-400">
                    Each appointment is {selectedDoctor.appointmentDurationMinutes} minutes.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Step 3 — Details */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                3
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-600">
                Appointment Details
              </h2>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Reason for Appointment
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(event) => updateField("reason", event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="Describe your health concern or symptoms..."
                  required
                />
              </div>

            </div>
          </div>

          {/* Alerts */}
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}



          {/* Actions */}
          <div className="flex justify-center pb-2">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                loadingSpecialties ||
                loadingDoctors ||
                loadingSlots ||
                !formData.specialization ||
                !formData.doctorId ||
                !formData.appointmentDate ||
                !formData.appointmentTime
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-md"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                  Proceed to Payment
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </section>
  );
}
