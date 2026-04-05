import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createAppointment,
  getDoctorAvailableSlots,
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
  const [successMessage, setSuccessMessage] = useState("");
  const [availableSlots, setAvailableSlots] = useState<AppointmentAvailabilitySlot[]>(
    []
  );
  const [slotInfoMessage, setSlotInfoMessage] = useState("");
  const [showAllAvailableDates, setShowAllAvailableDates] = useState(false);

  const selectedDoctor =
    doctors.find((doctor) => doctor._id === formData.doctorId) || null;
  const availableDateOptions = buildUpcomingAvailableDates(selectedDoctor);
  const visibleDateOptions = showAllAvailableDates
    ? availableDateOptions
    : availableDateOptions.slice(0, 8);

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

        setDoctors(Array.isArray(data) ? data : []);
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

      setSuccessMessage("");
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

    setSuccessMessage("");
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
    setSuccessMessage("");
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
      setSuccessMessage("");

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

      setSuccessMessage(
        response.message || "Appointment request created successfully."
      );
      setFormData(initialFormState);
      setDoctors([]);

      window.setTimeout(() => {
        navigate("/appointments/patient");
      }, 1200);
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
    <section className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_26%,#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="p-6 sm:p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                Create Appointment
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Choose a specialization first, then select a doctor from the
                doctor service. Appointment booking still submits only to the
                appointment service.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Specialization
                  </label>
                  <select
                    value={formData.specialization}
                    onChange={handleSpecializationChange}
                    disabled={loadingSpecialties}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                    required
                  >
                    <option value="">
                      {loadingSpecialties
                        ? "Loading specializations..."
                        : "Select specialization"}
                    </option>
                    {specialties.map((specialty) => (
                      <option key={specialty._id} value={specialty.name}>
                        {specialty.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Doctor
                  </label>
                  <select
                    value={formData.doctorId}
                    onChange={handleDoctorChange}
                    disabled={!formData.specialization || loadingDoctors}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
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

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Appointment Date
                  </label>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    {!formData.doctorId ? (
                      <p className="text-sm text-slate-500">
                        Select a doctor first to see available dates.
                      </p>
                    ) : availableDateOptions.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        This doctor has no bookable dates configured yet.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {visibleDateOptions.map((dateOption) => {
                          const isSelected =
                            formData.appointmentDate === dateOption.value;
                          const parts = formatDateParts(dateOption.value);

                          return (
                            <button
                              key={dateOption.value}
                              type="button"
                              onClick={() => handleAppointmentDateSelect(dateOption.value)}
                              className={`rounded-2xl border px-4 py-3 text-left transition ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                              }`}
                            >
                              <p
                                className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                                  isSelected ? "text-blue-100" : "text-slate-500"
                                }`}
                              >
                                {parts.weekday}
                              </p>
                              <p className="mt-2 text-base font-semibold">
                                {parts.monthDay}
                              </p>
                            </button>
                          );
                          })}
                        </div>

                        {availableDateOptions.length > 8 ? (
                          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-sm text-slate-600">
                              {showAllAvailableDates
                                ? `Showing all ${availableDateOptions.length} available dates`
                                : `Showing the next ${visibleDateOptions.length} available dates`}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setShowAllAvailableDates((current) => !current)
                              }
                              className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                              {showAllAvailableDates ? "Show fewer" : "Show more"}
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                  {selectedDoctor && availableDateOptions.length > 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Available on {getDoctorScheduleWeekdays(selectedDoctor).join(", ")}.
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Appointment Time
                  </label>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    {!formData.appointmentDate ? (
                      <p className="text-sm text-slate-500">
                        Choose a date first to see available time slots.
                      </p>
                    ) : loadingSlots ? (
                      <p className="text-sm text-slate-500">
                        Loading available times...
                      </p>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No appointment times are available for this date.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {availableSlots.map((slot) => {
                          const isSelected =
                            formData.appointmentTime === slot.time;

                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => updateField("appointmentTime", slot.time)}
                              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                              }`}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {slotInfoMessage ? (
                    <p className="mt-2 text-xs text-amber-600">{slotInfoMessage}</p>
                  ) : selectedDoctor?.appointmentDurationMinutes ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Each appointment is {selectedDoctor.appointmentDurationMinutes} minutes.
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reason for Appointment
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(event) => updateField("reason", event.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                  placeholder="Describe your health concern"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Status
                </label>
                <select
                  value={formData.paymentStatus}
                  onChange={(event) =>
                    updateField(
                      "paymentStatus",
                      event.target.value as AppointmentFormState["paymentStatus"]
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {errorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
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
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Creating Appointment..." : "Create Appointment"}
                </button>

                <Link
                  to="/appointments/patient"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to My Appointments
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
