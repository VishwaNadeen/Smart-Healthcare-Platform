import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/toastContext";
import PhoneNumberInput from "../../components/common/PhoneNumberInput";
import { useLocationToast } from "../../hooks/useLocationToast";
import { DOCTOR_API_URL, DOCTOR_SPECIALTY_API_URL } from "../../config/api";

type DoctorFormData = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
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
type TouchedFields = Partial<Record<keyof DoctorFormData, boolean>>;

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
    fields: ["fullName", "email", "password", "confirmPassword", "phone"],
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+[1-9]\d{9,14}$/;
const COUNTRY_CODE_ONLY_PATTERN = /^\+[1-9]\d{0,3}$/;

function hasMeaningfulPhoneValue(value: string) {
  const normalized = value.replace(/\s+/g, "");
  return Boolean(normalized) && !COUNTRY_CODE_ONLY_PATTERN.test(normalized);
}

function validateDoctorField(
  field: keyof DoctorFormData,
  value: string,
  data: DoctorFormData
): string {
  const trimmedValue = value.trim();

  switch (field) {
    case "fullName":
      if (!trimmedValue) return "Full name is required.";
      return "";

    case "email":
      if (!trimmedValue) return "Email is required.";
      if (!EMAIL_PATTERN.test(trimmedValue)) {
        return "Enter a valid email address.";
      }
      return "";

    case "password":
      if (!value) return "Password is required.";
      if (value.length < 6) {
        return "Password must be at least 6 characters.";
      }
      return "";

    case "confirmPassword":
      if (!value) return "Confirm password is required.";
      if (value !== data.password) {
        return "Passwords do not match.";
      }
      return "";

    case "phone":
      if (!trimmedValue || !hasMeaningfulPhoneValue(trimmedValue)) {
        return "Phone number is required.";
      }
      if (!PHONE_PATTERN.test(trimmedValue.replace(/\s+/g, ""))) {
        return "Enter a valid phone number with country code.";
      }
      return "";

    case "specialization":
      if (!trimmedValue) return "Please select a specialty.";
      return "";

    case "experience":
      if (!trimmedValue || Number(data.experience) < 0) {
        return "Enter valid experience.";
      }
      return "";

    case "qualification":
      if (!trimmedValue) return "Qualification is required.";
      return "";

    case "licenseNumber":
      if (!trimmedValue) return "License number is required.";
      return "";

    case "consultationFee":
      if (!trimmedValue || Number(data.consultationFee) < 0) {
        return "Enter valid consultation fee.";
      }
      return "";

    case "hospitalName":
      if (!trimmedValue) return "Hospital name is required.";
      if (trimmedValue.length < 2) {
        return "Hospital name must be at least 2 characters.";
      }
      return "";

    case "city":
      if (!trimmedValue) return "City is required.";
      if (trimmedValue.length < 2) {
        return "City must be at least 2 characters.";
      }
      return "";

    case "hospitalAddress":
      if (!trimmedValue) return "Hospital address is required.";
      if (trimmedValue.length < 5) {
        return "Hospital address must be at least 5 characters.";
      }
      return "";

    default:
      return "";
  }
}

function validateDoctorForm(data: DoctorFormData): FormErrors {
  return {
    fullName: validateDoctorField("fullName", data.fullName, data),
    email: validateDoctorField("email", data.email, data),
    password: validateDoctorField("password", data.password, data),
    confirmPassword: validateDoctorField(
      "confirmPassword",
      data.confirmPassword,
      data
    ),
    phone: validateDoctorField("phone", data.phone, data),
    specialization: validateDoctorField("specialization", data.specialization, data),
    experience: validateDoctorField("experience", data.experience, data),
    qualification: validateDoctorField("qualification", data.qualification, data),
    licenseNumber: validateDoctorField("licenseNumber", data.licenseNumber, data),
    consultationFee: validateDoctorField("consultationFee", data.consultationFee, data),
    hospitalName: validateDoctorField("hospitalName", data.hospitalName, data),
    hospitalAddress: validateDoctorField(
      "hospitalAddress",
      data.hospitalAddress,
      data
    ),
    city: validateDoctorField("city", data.city, data),
  };
}

function getFilledErrors(errors: FormErrors): FormErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([, value]) => Boolean(value))
  ) as FormErrors;
}

function getStepIndexForField(field: keyof DoctorFormData) {
  return STEPS.findIndex((step) => step.fields.includes(field));
}

function getServerFieldError(message: string): {
  field: keyof DoctorFormData;
  message: string;
} | null {
  const normalizedMessage = message.trim().toLowerCase();

  if (
    normalizedMessage.includes("email") &&
    (normalizedMessage.includes("already exists") ||
      normalizedMessage.includes("already registered") ||
      normalizedMessage.includes("already in use"))
  ) {
    return {
      field: "email",
      message: "This email is already registered. Please use a different email.",
    };
  }

  if (normalizedMessage.includes("hospital name")) {
    return {
      field: "hospitalName",
      message: message,
    };
  }

  if (normalizedMessage.includes("hospital address")) {
    return {
      field: "hospitalAddress",
      message: message,
    };
  }

  if (normalizedMessage.includes("city")) {
    return {
      field: "city",
      message: message,
    };
  }

  return null;
}

function getFriendlyDoctorErrorMessage(message: string) {
  const normalizedMessage = message.trim().toLowerCase();

  if (!normalizedMessage || normalizedMessage === "validation failed") {
    return "Please check the highlighted fields and correct the information.";
  }

  if (normalizedMessage.includes("validation failed")) {
    return "Please review the form details and correct any invalid fields.";
  }

  return message;
}

async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);

  if (
    data &&
    typeof data === "object" &&
    "errors" in data &&
    Array.isArray(data.errors)
  ) {
    const firstError = data.errors[0];

    if (typeof firstError === "string" && firstError.trim()) {
      return firstError;
    }

    if (
      firstError &&
      typeof firstError === "object" &&
      "message" in firstError &&
      typeof firstError.message === "string"
    ) {
      return firstError.message;
    }
  }

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
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
  const [validationStep, setValidationStep] = useState<number | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [formData, setFormData] = useState<DoctorFormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
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
        const response = await fetch(DOCTOR_SPECIALTY_API_URL);
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

  useLayoutEffect(() => {
    setErrors({});
    setTouchedFields({});
    setValidationStep(null);
  }, [currentStep]);

  const currentStepConfig = STEPS[currentStep];
  const hasFieldValue = (field: keyof DoctorFormData, value: string) =>
    field === "password"
      ? value.length > 0
      : field === "phone"
      ? hasMeaningfulPhoneValue(value)
      : value.trim().length > 0;

  const shouldShowFieldError = (field: keyof DoctorFormData) =>
    Boolean(
      errors[field] &&
        (touchedFields[field] || validationStep === currentStep)
    );

  const updateFieldError = (
    field: keyof DoctorFormData,
    value: string,
    nextFormData: DoctorFormData,
    markTouched: boolean
  ) => {
    const hasValue = hasFieldValue(field, value);

    return markTouched || hasValue || validationStep === currentStep
      ? validateDoctorField(field, value, nextFormData)
      : "";
  };

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
    const fieldName = name as keyof DoctorFormData;
    const nextFormData = {
      ...formData,
      [fieldName]: value,
    };
    const shouldMarkTouched = touchedFields[fieldName] || hasFieldValue(fieldName, value);

    setFormData(nextFormData);
    setErrorMessage("");
    setTouchedFields((prev) => ({
      ...prev,
      [fieldName]: shouldMarkTouched,
    }));
    setErrors((prev) => ({
      ...prev,
      [fieldName]: updateFieldError(
        fieldName,
        value,
        nextFormData,
        shouldMarkTouched
      ),
      ...(fieldName === "password" || fieldName === "confirmPassword"
        ? {
            confirmPassword: updateFieldError(
              "confirmPassword",
              nextFormData.confirmPassword,
              nextFormData,
              Boolean(
                touchedFields.confirmPassword ||
                  fieldName === "confirmPassword" ||
                  hasFieldValue("confirmPassword", nextFormData.confirmPassword)
              )
            ),
          }
        : {}),
    }));
  };

  const handleBlur = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    const fieldName = name as keyof DoctorFormData;

    setErrors((prev) => ({
      ...prev,
      [fieldName]: validateDoctorField(fieldName, value, formData),
      ...(fieldName === "password" || fieldName === "confirmPassword"
        ? {
            confirmPassword:
              touchedFields.confirmPassword || fieldName === "confirmPassword"
                ? validateDoctorField(
                    "confirmPassword",
                    fieldName === "confirmPassword"
                      ? value
                      : formData.confirmPassword,
                    {
                      ...formData,
                      [fieldName]: value,
                    }
                  )
                : prev.confirmPassword,
          }
        : {}),
    }));
  };

  const handlePhoneChange = (phone: string) => {
    const nextFormData = {
      ...formData,
      phone,
    };
    const shouldMarkTouched = touchedFields.phone || hasMeaningfulPhoneValue(phone);

    setFormData(nextFormData);
    setErrorMessage("");
    setTouchedFields((prev) => ({
      ...prev,
      phone: shouldMarkTouched,
    }));
    setErrors((prev) => ({
      ...prev,
      phone: updateFieldError("phone", phone, nextFormData, shouldMarkTouched),
    }));
  };

  const handlePhoneBlur = () => {
    setErrors((prev) => ({
      ...prev,
      phone: validateDoctorField("phone", formData.phone, formData),
    }));
  };

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProfileImageFile(event.target.files?.[0] || null);
  };

  const goNextStep = () => {
    const formErrors = getFilledErrors(validateDoctorForm(formData));
    const stepErrors = currentStepConfig.fields.reduce<FormErrors>((acc, field) => {
      if (formErrors[field]) {
        acc[field] = formErrors[field];
      }
      return acc;
    }, {});

    if (Object.keys(stepErrors).length > 0) {
      setValidationStep(currentStep);
      setTouchedFields((prev) => ({
        ...prev,
        ...Object.fromEntries(
          currentStepConfig.fields.map((field) => [field, true])
        ),
      }));
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      setErrorMessage("");
      return;
    }

    setAllowSubmit(false);
    setValidationStep(null);
    setErrorMessage("");
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goPreviousStep = () => {
    setAllowSubmit(false);
    setValidationStep(null);
    setErrorMessage("");
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!allowSubmit) {
      return;
    }

    const nextErrors = getFilledErrors(validateDoctorForm(formData));
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidField = Object.keys(nextErrors)[0] as keyof DoctorFormData;
      const firstInvalidStep = Math.max(0, getStepIndexForField(firstInvalidField));

      setCurrentStep(firstInvalidStep);
      setValidationStep(firstInvalidStep);
      setTouchedFields(
        Object.fromEntries(
          Object.keys(nextErrors).map((field) => [field, true])
        ) as TouchedFields
      );
      setErrors(nextErrors);
      setErrorMessage("");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key !== "confirmPassword") {
        payload.append(key, value);
      }
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
      const rawMessage =
        error instanceof Error ? error.message : "Failed to register doctor.";
      const message = getFriendlyDoctorErrorMessage(rawMessage);
      const serverFieldError = getServerFieldError(rawMessage);

      if (serverFieldError) {
        setCurrentStep(Math.max(0, getStepIndexForField(serverFieldError.field)));
        setValidationStep(null);
        setErrorMessage("");
        setTouchedFields((prev) => ({
          ...prev,
          [serverFieldError.field]: true,
        }));
        setErrors((prev) => ({
          ...prev,
          [serverFieldError.field]: serverFieldError.message,
        }));
      } else {
        const fallbackErrors = getFilledErrors(validateDoctorForm(formData));

        if (Object.keys(fallbackErrors).length > 0) {
          const firstInvalidField = Object.keys(
            fallbackErrors
          )[0] as keyof DoctorFormData;
          const firstInvalidStep = Math.max(
            0,
            getStepIndexForField(firstInvalidField)
          );

          setCurrentStep(firstInvalidStep);
          setValidationStep(firstInvalidStep);
          setTouchedFields(
            Object.fromEntries(
              Object.keys(fallbackErrors).map((field) => [field, true])
            ) as TouchedFields
          );
          setErrors(fallbackErrors);
          setErrorMessage(message);
        } else {
          setErrorMessage(message);
        }

        showToast(message, "error");
      }
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
                      onBlur={handleBlur}
                      className={getFieldClass(shouldShowFieldError("fullName"))}
                      placeholder="Dr. Shashen Kumara"
                    />
                    {shouldShowFieldError("fullName") && (
                      <p className="mt-2 text-sm text-red-600">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={getFieldClass(shouldShowFieldError("email"))}
                      placeholder="doctor@gmail.com"
                    />
                    {shouldShowFieldError("email") && (
                      <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={getFieldClass(shouldShowFieldError("password"))}
                        placeholder="Enter password"
                      />
                      {shouldShowFieldError("password") && (
                        <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={getFieldClass(
                          shouldShowFieldError("confirmPassword")
                        )}
                        placeholder="Re-enter password"
                      />
                      {shouldShowFieldError("confirmPassword") && (
                        <p className="mt-2 text-sm text-red-600">
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Phone
                    </label>
                    <PhoneNumberInput
                      value={formData.phone}
                      onChange={(phone) => handlePhoneChange(phone)}
                      onBlur={handlePhoneBlur}
                      error={shouldShowFieldError("phone") ? errors.phone : ""}
                    />
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
                        onBlur={handleBlur}
                        className={getFieldClass(
                          shouldShowFieldError("specialization")
                        )}
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
                      {shouldShowFieldError("specialization") && (
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
                        onBlur={handleBlur}
                        className={getFieldClass(
                          shouldShowFieldError("experience")
                        )}
                        placeholder="8"
                      />
                      {shouldShowFieldError("experience") && (
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
                        onBlur={handleBlur}
                        className={getFieldClass(
                          shouldShowFieldError("qualification")
                        )}
                        placeholder="MBBS, MD Pediatrics"
                      />
                      {shouldShowFieldError("qualification") && (
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
                        onBlur={handleBlur}
                        className={getFieldClass(
                          shouldShowFieldError("licenseNumber")
                        )}
                        placeholder="SLMC-00715"
                      />
                      {shouldShowFieldError("licenseNumber") && (
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
                        onBlur={handleBlur}
                        className={getFieldClass(
                          shouldShowFieldError("consultationFee")
                        )}
                        placeholder="4500"
                      />
                      {shouldShowFieldError("consultationFee") && (
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
                        onBlur={handleBlur}
                        className={getFieldClass(
                          shouldShowFieldError("hospitalName")
                        )}
                        placeholder="City Medical Centre"
                      />
                      {shouldShowFieldError("hospitalName") && (
                        <p className="mt-2 text-sm text-red-600">{errors.hospitalName}</p>
                      )}
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
                        onBlur={handleBlur}
                        className={getFieldClass(shouldShowFieldError("city"))}
                        placeholder="Colombo"
                      />
                      {shouldShowFieldError("city") && (
                        <p className="mt-2 text-sm text-red-600">{errors.city}</p>
                      )}
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
                      onBlur={handleBlur}
                      rows={4}
                      className={getFieldClass(
                        shouldShowFieldError("hospitalAddress")
                      )}
                      placeholder="No 10, Main Street, Colombo"
                    />
                    {shouldShowFieldError("hospitalAddress") && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.hospitalAddress}
                      </p>
                    )}
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
