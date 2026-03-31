import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/ToastProvider";
import { useLocationToast } from "../../hooks/useLocationToast";
import { DOCTOR_API_URL, SPECIALTY_API_URL } from "../../config/api";

type AvailabilitySlotForm = {
  day: string;
  startTime: string;
  endTime: string;
  mode: "in_person" | "video" | "both";
  maxAppointments: string;
};

type DoctorFormData = {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  specialization: string;
  experience: string;
  qualification: string;
  licenseNumber: string;
  hospitalName: string;
  hospitalAddress: string;
  city: string;
  consultationFee: string;
  profileImage: string;
  about: string;
  availableDays: string[];
  availableTimeSlots: string[];
  isAvailableForVideo: boolean;
  supportsDigitalPrescriptions: boolean;
  acceptsNewAppointments: boolean;
  availabilitySchedule: AvailabilitySlotForm[];
};

type FormErrors = Partial<Record<keyof DoctorFormData, string>>;

type StepConfig = {
  id: number;
  title: string;
  description: string;
  fields: Array<keyof DoctorFormData>;
};

type TimeSlotForm = {
  startTime: string;
  endTime: string;
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

const STEPS: StepConfig[] = [
  {
    id: 1,
    title: "Doctor Info",
    description: "Basic account and contact details.",
    fields: ["fullName", "email", "password", "phone"],
  },
  {
    id: 2,
    title: "Professional Info",
    description: "Specialty, experience, fees, and credentials.",
    fields: [
      "specialization",
      "experience",
      "qualification",
      "licenseNumber",
      "consultationFee",
      "about",
      "profileImage",
    ],
  },
  {
    id: 3,
    title: "Location",
    description: "Hospital and city information.",
    fields: ["hospitalName", "hospitalAddress", "city"],
  },
  {
    id: 4,
    title: "Availability",
    description: "Appointment schedule and service options.",
    fields: [
      "availableDays",
      "availableTimeSlots",
      "availabilitySchedule",
      "isAvailableForVideo",
      "supportsDigitalPrescriptions",
      "acceptsNewAppointments",
    ],
  },
];

function getFieldClass(hasError: boolean) {
  return `w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-400 focus:ring-red-200"
      : "border-slate-300 focus:ring-blue-500"
  }`;
}

function validateDoctorForm(data: DoctorFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!data.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!data.password) {
    errors.password = "Password is required.";
  } else if (data.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  if (!data.phone.trim()) {
    errors.phone = "Phone number is required.";
  }

  if (!data.specialization.trim()) {
    errors.specialization = "Please select a specialty.";
  }

  if (!data.experience.trim() || Number(data.experience) < 0) {
    errors.experience = "Enter valid experience.";
  }

  if (!data.qualification.trim()) {
    errors.qualification = "Qualification is required.";
  }

  if (!data.licenseNumber.trim()) {
    errors.licenseNumber = "License number is required.";
  }

  if (!data.consultationFee.trim() || Number(data.consultationFee) < 0) {
    errors.consultationFee = "Enter valid consultation fee.";
  }

  return errors;
}

async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);

  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }

  return fallback;
}

export default function DoctorRegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  useLocationToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [loading, setLoading] = useState(false);
  const [allowSubmit, setAllowSubmit] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [timeSlotForms, setTimeSlotForms] = useState<TimeSlotForm[]>([
    { startTime: "", endTime: "" },
  ]);
  const [formData, setFormData] = useState<DoctorFormData>({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    specialization: "",
    experience: "",
    qualification: "",
    licenseNumber: "",
    hospitalName: "",
    hospitalAddress: "",
    city: "",
    consultationFee: "",
    profileImage: "",
    about: "",
    availableDays: [],
    availableTimeSlots: [],
    isAvailableForVideo: true,
    supportsDigitalPrescriptions: true,
    acceptsNewAppointments: true,
    availabilitySchedule: [
      {
        day: "",
        startTime: "",
        endTime: "",
        mode: "both",
        maxAppointments: "6",
      },
    ],
  });

  useEffect(() => {
    async function loadSpecialties() {
      try {
        const response = await fetch(SPECIALTY_API_URL);
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Failed to load specialties."));
        }

        const data = (await response.json()) as Array<{ name?: string }>;
        setSpecialties(
          data
            .map((item) => item.name?.trim() || "")
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to load specialties.";
        setErrorMessage(message);
      } finally {
        setLoadingSpecialties(false);
      }
    }

    loadSpecialties();
  }, []);

  const currentStepConfig = STEPS[currentStep];

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target;
    const target = event.target;

    if (type === "checkbox" && target instanceof HTMLInputElement) {
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const updateAvailableTimeSlots = (slots: TimeSlotForm[]) => {
    setTimeSlotForms(slots);
    setFormData((prev) => ({
      ...prev,
      availableTimeSlots: slots
        .filter((slot) => slot.startTime && slot.endTime)
        .map((slot) => `${slot.startTime}-${slot.endTime}`),
    }));
  };

  const toggleAvailableDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((item) => item !== day)
        : [...prev.availableDays, day],
    }));
  };

  const handleTimeSlotChange = (
    index: number,
    field: keyof TimeSlotForm,
    value: string
  ) => {
    const nextSlots = timeSlotForms.map((slot, slotIndex) =>
      slotIndex === index ? { ...slot, [field]: value } : slot
    );
    updateAvailableTimeSlots(nextSlots);
  };

  const addTimeSlot = () => {
    updateAvailableTimeSlots([...timeSlotForms, { startTime: "", endTime: "" }]);
  };

  const removeTimeSlot = (index: number) => {
    const nextSlots =
      timeSlotForms.length === 1
        ? timeSlotForms
        : timeSlotForms.filter((_, slotIndex) => slotIndex !== index);
    updateAvailableTimeSlots(nextSlots);
  };

  const handleScheduleChange = (
    index: number,
    field: keyof AvailabilitySlotForm,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      availabilitySchedule: prev.availabilitySchedule.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  const addScheduleRow = () => {
    setFormData((prev) => ({
      ...prev,
      availabilitySchedule: [
        ...prev.availabilitySchedule,
        {
          day: "",
          startTime: "",
          endTime: "",
          mode: "both",
          maxAppointments: "6",
        },
      ],
    }));
  };

  const removeScheduleRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      availabilitySchedule:
        prev.availabilitySchedule.length === 1
          ? prev.availabilitySchedule
          : prev.availabilitySchedule.filter((_, slotIndex) => slotIndex !== index),
    }));
  };

  const goNextStep = () => {
    const formErrors = validateDoctorForm(formData);
    const stepErrors = currentStepConfig.fields.reduce<FormErrors>((acc, field) => {
      if (formErrors[field]) {
        acc[field] = formErrors[field];
      }

      return acc;
    }, {});

    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      setErrorMessage("Please complete the required fields before continuing.");
      return;
    }

    setErrorMessage("");
    setAllowSubmit(false);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goPreviousStep = () => {
    setErrorMessage("");
    setAllowSubmit(false);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!allowSubmit) {
      return;
    }

    const nextErrors = validateDoctorForm(formData);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setErrorMessage("Please correct the highlighted fields.");
      showToast("Please correct the highlighted fields.", "error");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const payload = {
      ...formData,
      experience: Number(formData.experience),
      consultationFee: Number(formData.consultationFee),
      availabilitySchedule: formData.availabilitySchedule
        .filter((slot) => slot.day && slot.startTime && slot.endTime)
        .map((slot) => ({
          ...slot,
          maxAppointments: Number(slot.maxAppointments) || 1,
        })),
    };

    try {
      const response = await fetch(DOCTOR_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to register doctor."));
      }

      showToast(
        "Doctor registration submitted successfully. Please wait for admin approval.",
        "success"
      );

      navigate("/login", {
        replace: true,
        state: {
          successMessage:
            "Doctor registration submitted successfully. Please wait for admin approval before login.",
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to register doctor.";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setAllowSubmit(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
        <div className="bg-blue-600 p-8 text-white md:p-10">
          <h1 className="text-3xl font-bold md:text-4xl">Doctor Registration</h1>
          <p className="mt-4 leading-7 text-blue-100">
            Create your doctor account, submit your profile details, and wait for
            admin approval before using the appointment workflow.
          </p>

          <div className="mt-8 space-y-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`rounded-xl p-4 ${
                  index === currentStep ? "bg-white/20" : "bg-white/10"
                }`}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
                  Step {step.id}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-blue-100">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {currentStepConfig.title}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {currentStepConfig.description}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              {currentStep + 1} / {STEPS.length}
            </span>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in here
            </Link>
          </p>

          {errorMessage && (
            <div className="mt-6 rounded-lg bg-red-100 px-4 py-3 text-red-700">
              {errorMessage}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !(event.target instanceof HTMLTextAreaElement)) {
                event.preventDefault();
              }
            }}
            className="mt-6 space-y-5"
          >
            {currentStep === 0 && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={getFieldClass(Boolean(errors.fullName))}
                    placeholder="Dr. Shashen Kumara"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={getFieldClass(Boolean(errors.email))}
                      placeholder="doctor@gmail.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={getFieldClass(Boolean(errors.password))}
                      placeholder="Enter password"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={getFieldClass(Boolean(errors.phone))}
                    placeholder="+94771234567"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>
              </>
            )}

            {currentStep === 1 && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Specialty
                    </label>
                    <select
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      className={getFieldClass(Boolean(errors.specialization))}
                      disabled={loadingSpecialties}
                    >
                      <option value="">
                        {loadingSpecialties ? "Loading specialties..." : "Select specialty"}
                      </option>
                      {specialties.map((specialty) => (
                        <option key={specialty} value={specialty}>
                          {specialty}
                        </option>
                      ))}
                    </select>
                    {errors.specialization && (
                      <p className="mt-1 text-sm text-red-600">{errors.specialization}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Experience
                    </label>
                    <input
                      type="number"
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      className={getFieldClass(Boolean(errors.experience))}
                      placeholder="8"
                    />
                    {errors.experience && (
                      <p className="mt-1 text-sm text-red-600">{errors.experience}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Qualification
                    </label>
                    <input
                      type="text"
                      name="qualification"
                      value={formData.qualification}
                      onChange={handleChange}
                      className={getFieldClass(Boolean(errors.qualification))}
                      placeholder="MBBS, MD Pediatrics"
                    />
                    {errors.qualification && (
                      <p className="mt-1 text-sm text-red-600">{errors.qualification}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      License Number
                    </label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      className={getFieldClass(Boolean(errors.licenseNumber))}
                      placeholder="SLMC-00715"
                    />
                    {errors.licenseNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.licenseNumber}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Consultation Fee
                    </label>
                    <input
                      type="number"
                      name="consultationFee"
                      value={formData.consultationFee}
                      onChange={handleChange}
                      className={getFieldClass(Boolean(errors.consultationFee))}
                      placeholder="4500"
                    />
                    {errors.consultationFee && (
                      <p className="mt-1 text-sm text-red-600">{errors.consultationFee}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Profile Image URL
                    </label>
                    <input
                      type="text"
                      name="profileImage"
                      value={formData.profileImage}
                      onChange={handleChange}
                      className={getFieldClass(false)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    About
                  </label>
                  <textarea
                    name="about"
                    value={formData.about}
                    onChange={handleChange}
                    rows={3}
                    className={getFieldClass(false)}
                    placeholder="Experienced specialist profile summary"
                  />
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Hospital Name
                    </label>
                    <input
                      type="text"
                      name="hospitalName"
                      value={formData.hospitalName}
                      onChange={handleChange}
                      className={getFieldClass(false)}
                      placeholder="City Medical Centre"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={getFieldClass(false)}
                      placeholder="Colombo"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Hospital Address
                  </label>
                  <textarea
                    name="hospitalAddress"
                    value={formData.hospitalAddress}
                    onChange={handleChange}
                    rows={3}
                    className={getFieldClass(false)}
                    placeholder="No 10, Main Street, Colombo"
                  />
                </div>
              </>
            )}

            {currentStep === 3 && (
              <>
                <div className="space-y-6">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Available Days
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {DAY_OPTIONS.map((day) => {
                        const selected = formData.availableDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleAvailableDay(day)}
                            className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                              selected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-700">
                        Available Time Slots
                      </label>
                      <button
                        type="button"
                        onClick={addTimeSlot}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Add time slot
                      </button>
                    </div>
                    <div className="space-y-3">
                      {timeSlotForms.map((slot, index) => (
                        <div
                          key={`time-slot-${index}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-700">
                              Time Slot {index + 1}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeTimeSlot(index)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                Start Time
                              </label>
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(event) =>
                                  handleTimeSlotChange(index, "startTime", event.target.value)
                                }
                                className={`${getFieldClass(false)} min-w-0`}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                End Time
                              </label>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(event) =>
                                  handleTimeSlotChange(index, "endTime", event.target.value)
                                }
                                className={`${getFieldClass(false)} min-w-0`}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">
                    Selected Summary
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Days:{" "}
                    {formData.availableDays.length > 0
                      ? formData.availableDays.join(", ")
                      : "No days selected"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Time slots:{" "}
                    {formData.availableTimeSlots.length > 0
                      ? formData.availableTimeSlots.join(", ")
                      : "No time slots selected"}
                  </p>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">
                      Availability Schedule
                    </label>
                    <button
                      type="button"
                      onClick={addScheduleRow}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Add slot
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.availabilitySchedule.map((slot, index) => (
                      <div
                        key={`${slot.day}-${index}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-700">
                            Schedule Slot {index + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeScheduleRow(index)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                              Day
                            </label>
                            <select
                              value={slot.day}
                              onChange={(event) =>
                                handleScheduleChange(index, "day", event.target.value)
                              }
                              className={getFieldClass(false)}
                            >
                              <option value="">Select day</option>
                              {DAY_OPTIONS.map((day) => (
                                <option key={day} value={day}>
                                  {day}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(event) =>
                                handleScheduleChange(index, "startTime", event.target.value)
                              }
                              className={`${getFieldClass(false)} min-w-0`}
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                              End Time
                            </label>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(event) =>
                                handleScheduleChange(index, "endTime", event.target.value)
                              }
                              className={`${getFieldClass(false)} min-w-0`}
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                              Mode
                            </label>
                            <select
                              value={slot.mode}
                              onChange={(event) =>
                                handleScheduleChange(index, "mode", event.target.value)
                              }
                              className={getFieldClass(false)}
                            >
                              <option value="both">Both</option>
                              <option value="in_person">In Person</option>
                              <option value="video">Video</option>
                            </select>
                          </div>

                          <div className="xl:col-span-2">
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                              Max Appointments
                            </label>
                            <input
                              type="number"
                              value={slot.maxAppointments}
                              onChange={(event) =>
                                handleScheduleChange(
                                  index,
                                  "maxAppointments",
                                  event.target.value
                                )
                              }
                              className={getFieldClass(false)}
                              placeholder="6"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <label className="flex min-h-20 items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="isAvailableForVideo"
                      checked={formData.isAvailableForVideo}
                      onChange={handleChange}
                      className="mt-1 shrink-0"
                    />
                    <span className="leading-6">Available for video</span>
                  </label>
                  <label className="flex min-h-20 items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="supportsDigitalPrescriptions"
                      checked={formData.supportsDigitalPrescriptions}
                      onChange={handleChange}
                      className="mt-1 shrink-0"
                    />
                    <span className="leading-6">Digital prescriptions</span>
                  </label>
                  <label className="flex min-h-20 items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="acceptsNewAppointments"
                      checked={formData.acceptsNewAppointments}
                      onChange={handleChange}
                      className="mt-1 shrink-0"
                    />
                    <span className="leading-6">Accept new appointments</span>
                  </label>
                </div>
              </>
            )}

            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={goPreviousStep}
                disabled={currentStep === 0}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>

              {currentStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={goNextStep}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Next -&gt;
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={() => setAllowSubmit(true)}
                  disabled={loading}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
                >
                  {loading ? "Submitting..." : "Register Doctor"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
