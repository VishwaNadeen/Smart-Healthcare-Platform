import { useEffect, useMemo, useState } from "react";
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

  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
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

  const availableDaysInput = useMemo(
    () => formData.availableDays.join(", "),
    [formData.availableDays]
  );
  const availableTimeSlotsInput = useMemo(
    () => formData.availableTimeSlots.join(", "),
    [formData.availableTimeSlots]
  );

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

  const handleListFieldChange = (
    field: "availableDays" | "availableTimeSlots",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
            <div className="rounded-xl bg-white/10 p-4">
              <h3 className="text-lg font-semibold">Admin Verification</h3>
              <p className="mt-1 text-sm text-blue-100">
                New doctor registrations stay pending until the admin reviews them.
              </p>
            </div>

            <div className="rounded-xl bg-white/10 p-4">
              <h3 className="text-lg font-semibold">Specialty Selection</h3>
              <p className="mt-1 text-sm text-blue-100">
                Choose from specialties managed by the doctor-service.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <h2 className="text-2xl font-bold text-slate-800">Fill Doctor Details</h2>
          <p className="mt-2 text-sm text-slate-500">
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

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            </div>

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
                rows={2}
                className={getFieldClass(false)}
                placeholder="No 10, Main Street, Colombo"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Available Days
                </label>
                <input
                  type="text"
                  value={availableDaysInput}
                  onChange={(event) =>
                    handleListFieldChange("availableDays", event.target.value)
                  }
                  className={getFieldClass(false)}
                  placeholder="Monday, Wednesday, Friday"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Available Time Slots
                </label>
                <input
                  type="text"
                  value={availableTimeSlotsInput}
                  onChange={(event) =>
                    handleListFieldChange("availableTimeSlots", event.target.value)
                  }
                  className={getFieldClass(false)}
                  placeholder="09:00-11:00, 14:00-16:00"
                />
              </div>
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
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                      <input
                        type="text"
                        value={slot.day}
                        onChange={(event) =>
                          handleScheduleChange(index, "day", event.target.value)
                        }
                        className={getFieldClass(false)}
                        placeholder="Monday"
                      />
                      <input
                        type="text"
                        value={slot.startTime}
                        onChange={(event) =>
                          handleScheduleChange(index, "startTime", event.target.value)
                        }
                        className={getFieldClass(false)}
                        placeholder="09:00"
                      />
                      <input
                        type="text"
                        value={slot.endTime}
                        onChange={(event) =>
                          handleScheduleChange(index, "endTime", event.target.value)
                        }
                        className={getFieldClass(false)}
                        placeholder="11:00"
                      />
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
                      <div className="flex gap-2">
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
                        <button
                          type="button"
                          onClick={() => removeScheduleRow(index)}
                          className="rounded-xl border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="isAvailableForVideo"
                  checked={formData.isAvailableForVideo}
                  onChange={handleChange}
                />
                Available for video
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="supportsDigitalPrescriptions"
                  checked={formData.supportsDigitalPrescriptions}
                  onChange={handleChange}
                />
                Digital prescriptions
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="acceptsNewAppointments"
                  checked={formData.acceptsNewAppointments}
                  onChange={handleChange}
                />
                Accept new appointments
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
            >
              {loading ? "Submitting..." : "Register Doctor"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
