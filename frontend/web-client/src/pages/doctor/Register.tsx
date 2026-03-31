import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/ToastProvider";
import { useLocationToast } from "../../hooks/useLocationToast";
import { DOCTOR_API_URL, SPECIALTY_API_URL } from "../../config/api";

type DoctorFormData = {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  specialization: string;
  experience: string;
  qualification: string;
  licenseNumber: string;
  consultationFee: string;
  about: string;
  hospitalName: string;
  hospitalAddress: string;
  city: string;
};

type FormErrors = Partial<Record<keyof DoctorFormData, string>>;

type StepConfig = {
  id: number;
  title: string;
  eyebrow: string;
  description: string;
  fields: Array<keyof DoctorFormData>;
};

const STEPS: StepConfig[] = [
  {
    id: 1,
    title: "Account Setup",
    eyebrow: "Doctor Info",
    description:
      "Set up the doctor account with essential identity and contact details.",
    fields: ["fullName", "email", "password", "phone"],
  },
  {
    id: 2,
    title: "Professional Details",
    eyebrow: "Credentials",
    description:
      "Add specialty, licensing, consultation fee, and a short professional summary.",
    fields: [
      "specialization",
      "experience",
      "qualification",
      "licenseNumber",
      "consultationFee",
    ],
  },
  {
    id: 3,
    title: "Practice Location",
    eyebrow: "Hospital Info",
    description:
      "Add the doctor's practice location now. Availability can be completed later from the doctor profile.",
    fields: ["hospitalName", "hospitalAddress", "city"],
  },
];

function getFieldClass(hasError: boolean) {
  return `w-full rounded-2xl border bg-white px-4 py-3.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
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
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [formData, setFormData] = useState<DoctorFormData>({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    specialization: "",
    experience: "",
    qualification: "",
    licenseNumber: "",
    consultationFee: "",
    about: "",
    hospitalName: "",
    hospitalAddress: "",
    city: "",
  });

  useEffect(() => {
    async function loadSpecialties() {
      try {
        const response = await fetch(SPECIALTY_API_URL);
        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response, "Failed to load specialties.")
          );
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

  useEffect(() => {
    if (!profileImageFile) {
      setProfileImagePreview("");
      return;
    }

    const nextPreview = URL.createObjectURL(profileImageFile);
    setProfileImagePreview(nextPreview);

    return () => URL.revokeObjectURL(nextPreview);
  }, [profileImageFile]);

  const currentStepConfig = STEPS[currentStep];
  const completionCount = useMemo(
    () =>
      Object.values(formData).filter((value) =>
        typeof value === "string" ? value.trim().length > 0 : Boolean(value)
      ).length + (profileImageFile ? 1 : 0),
    [formData, profileImageFile]
  );

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProfileImageFile(event.target.files?.[0] || null);
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

    setAllowSubmit(false);
    setErrorMessage("");
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goPreviousStep = () => {
    setAllowSubmit(false);
    setErrorMessage("");
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

    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value);
    });

    if (profileImageFile) {
      payload.append("profileImage", profileImageFile);
    }

    try {
      const response = await fetch(DOCTOR_API_URL, {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to register doctor."));
      }

      showToast(
        "Doctor registration submitted successfully. Complete availability from your profile after approval.",
        "success"
      );

      navigate("/login", {
        replace: true,
        state: {
          successMessage:
            "Doctor registration submitted successfully. Wait for admin approval, then complete your availability from the doctor profile.",
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_#f8fafc_42%,_#eef2ff)] px-4 py-10">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur md:grid-cols-[0.95fr_1.05fr]">
        <aside className="bg-[linear-gradient(160deg,_#1d4ed8,_#2563eb_50%,_#0f172a_140%)] p-8 text-white md:p-10">
          <div className="max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-100">
              Doctor Service
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight">
              Clean registration first. Practice setup later.
            </h1>
            <p className="mt-5 text-base leading-7 text-blue-100/95">
              This form only collects the essentials needed to create the doctor account.
              Availability and scheduling can be configured from the doctor profile after
              registration and approval.
            </p>

            <div className="mt-8 rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-100">
                Progress
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-bold">{currentStep + 1}</p>
                  <p className="mt-1 text-sm text-blue-100">of {STEPS.length} steps</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold">{completionCount}</p>
                  <p className="mt-1 text-sm text-blue-100">filled inputs</p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {STEPS.map((step, index) => {
                const active = index === currentStep;
                const completed = index < currentStep;

                return (
                  <div
                    key={step.id}
                    className={`rounded-3xl border px-5 py-5 transition ${
                      active
                        ? "border-white/30 bg-white/16 shadow-lg"
                        : completed
                        ? "border-white/10 bg-white/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-100">
                          {step.eyebrow}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                      </div>
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                          active || completed
                            ? "bg-white text-blue-700"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        {step.id}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-blue-100">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="p-8 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
                {currentStepConfig.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {currentStepConfig.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                {currentStepConfig.description}
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
              {currentStep + 1} / {STEPS.length}
            </span>
          </div>

          <p className="mt-5 text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in here
            </Link>
          </p>

          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
            className="mt-8"
          >
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-7">
              {currentStep === 0 && (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                      <p className="mt-2 text-sm text-red-600">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                        <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                        <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                      <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                        <p className="mt-2 text-sm text-red-600">{errors.specialization}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                        <p className="mt-2 text-sm text-red-600">{errors.experience}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                        <p className="mt-2 text-sm text-red-600">{errors.qualification}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                        <p className="mt-2 text-sm text-red-600">{errors.licenseNumber}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-[0.42fr_0.58fr]">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                        <p className="mt-2 text-sm text-red-600">{errors.consultationFee}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Profile Photo
                      </label>
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-sm text-slate-400">
                            {profileImagePreview ? (
                              <img
                                src={profileImagePreview}
                                alt="Doctor preview"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="px-2 text-center">Doctor photo</span>
                            )}
                          </div>

                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleProfileImageChange}
                              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
                            />
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              Upload a profile image. The file will be stored through
                              doctor-service using Cloudinary.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      About
                    </label>
                    <textarea
                      name="about"
                      value={formData.about}
                      onChange={handleChange}
                      rows={4}
                      className={getFieldClass(false)}
                      placeholder="Write a short professional introduction for the doctor profile."
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Hospital Address
                    </label>
                    <textarea
                      name="hospitalAddress"
                      value={formData.hospitalAddress}
                      onChange={handleChange}
                      rows={4}
                      className={getFieldClass(false)}
                      placeholder="No 10, Main Street, Colombo"
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                      What happens next
                    </p>
                    <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        1. Admin reviews the doctor details and credentials.
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        2. The doctor logs in after approval.
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        3. Availability and schedule are completed from the profile page.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={goPreviousStep}
                disabled={currentStep === 0}
                className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>

              {currentStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={goNextStep}
                  className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Next -&gt;
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={() => setAllowSubmit(true)}
                  disabled={loading}
                  className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
                >
                  {loading ? "Submitting..." : "Register Doctor"}
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
