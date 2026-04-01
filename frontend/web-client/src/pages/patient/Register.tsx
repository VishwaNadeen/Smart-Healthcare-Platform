import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { defaultCountries } from "react-international-phone";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/ToastProvider";
import { useLocationToast } from "../../hooks/useLocationToast";
import PhoneNumberInput from "../../components/common/PhoneNumberInput";
import { PatientApiError, registerPatient } from "../../services/patientApi";

type PatientFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  countryCode: string;
  phone: string;
  birthday: string;
  gender: "" | "male" | "female" | "other";
  address: string;
  country: string;
};

type FormErrors = Partial<Record<keyof PatientFormData, string>>;

const NAME_PATTERN = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const COUNTRY_PATTERN = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
const COUNTRY_CODE_PATTERN = /^\+[1-9]\d{0,3}$/;
const PHONE_PATTERN = /^\+[1-9]\d{7,15}$/;
const COUNTRY_OPTIONS = Array.from(
  new Set(defaultCountries.map((country) => country[0] as string))
).sort((firstCountry, secondCountry) =>
  firstCountry.localeCompare(secondCountry)
);

function validateField(
  field: keyof PatientFormData,
  value: string,
  data: PatientFormData
): string {
  const trimmedValue = value.trim();

  switch (field) {
    case "firstName":
      if (!trimmedValue) return "First name is required.";
      if (trimmedValue.length < 2) {
        return "First name must be at least 2 characters.";
      }
      if (trimmedValue.length > 50) {
        return "First name must be 50 characters or fewer.";
      }
      if (!NAME_PATTERN.test(trimmedValue)) {
        return "First name can contain only letters, spaces, apostrophes, and hyphens.";
      }
      return "";

    case "lastName":
      if (!trimmedValue) return "Last name is required.";
      if (trimmedValue.length < 2) {
        return "Last name must be at least 2 characters.";
      }
      if (trimmedValue.length > 50) {
        return "Last name must be 50 characters or fewer.";
      }
      if (!NAME_PATTERN.test(trimmedValue)) {
        return "Last name can contain only letters, spaces, apostrophes, and hyphens.";
      }
      return "";

    case "email":
      if (!trimmedValue) return "Email is required.";
      if (!EMAIL_PATTERN.test(trimmedValue)) {
        return "Enter a valid email address.";
      }
      return "";

    case "password":
      if (!value) return "Password is required.";
      if (value.length < 6) return "Password must be at least 6 characters.";
      if (value.length > 100) {
        return "Password must be 100 characters or fewer.";
      }
      if (!PASSWORD_PATTERN.test(value)) {
        return "Password must include uppercase, lowercase, number, and special character.";
      }
      return "";

    case "confirmPassword":
      if (!value) return "Confirm password is required.";
      if (value !== data.password) {
        return "Passwords do not match.";
      }
      return "";

    case "phone":
      if (!trimmedValue) return "Phone number is required.";
      if (!PHONE_PATTERN.test(trimmedValue)) {
        return "Enter a valid phone number with country code.";
      }
      return "";

    case "countryCode":
      if (!trimmedValue) return "Country code is required.";
      if (!COUNTRY_CODE_PATTERN.test(trimmedValue)) {
        return "Enter a valid country code.";
      }
      return "";

    case "birthday": {
      if (!value) return "Birthday is required.";

      const birthday = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (Number.isNaN(birthday.getTime())) return "Enter a valid birthday.";
      if (birthday > today) return "Birthday cannot be in the future.";
      return "";
    }

    case "gender":
      if (!data.gender) return "Please select a gender.";
      return "";

    case "address":
      if (trimmedValue.length > 255) {
        return "Address must be 255 characters or fewer.";
      }
      return "";

    case "country":
      if (!trimmedValue) return "Country is required.";
      if (trimmedValue.length < 2) {
        return "Country must be at least 2 characters.";
      }
      if (trimmedValue.length > 100) {
        return "Country must be 100 characters or fewer.";
      }
      if (!COUNTRY_PATTERN.test(trimmedValue)) {
        return "Country can contain only letters, spaces, periods, apostrophes, and hyphens.";
      }
      return "";

    default:
      return "";
  }
}

function validatePatientForm(data: PatientFormData): FormErrors {
  return {
    firstName: validateField("firstName", data.firstName, data),
    lastName: validateField("lastName", data.lastName, data),
    email: validateField("email", data.email, data),
    password: validateField("password", data.password, data),
    confirmPassword: validateField(
      "confirmPassword",
      data.confirmPassword,
      data
    ),
    countryCode: validateField("countryCode", data.countryCode, data),
    phone: validateField("phone", data.phone, data),
    birthday: validateField("birthday", data.birthday, data),
    gender: validateField("gender", data.gender, data),
    address: validateField("address", data.address, data),
    country: validateField("country", data.country, data),
  };
}

function getFilledErrors(errors: FormErrors): FormErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([, value]) => Boolean(value))
  ) as FormErrors;
}

function getFieldClass(hasError: boolean) {
  return `w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-400 focus:ring-red-200"
      : "border-slate-300 focus:ring-blue-500"
  }`;
}

export default function PatientRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  useLocationToast();

  const [formData, setFormData] = useState<PatientFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    countryCode: "+94",
    phone: "",
    birthday: "",
    gender: "",
    address: "",
    country: "Sri Lanka",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof PatientFormData;

    const nextFormData = {
      ...formData,
      [fieldName]: value,
    };

    setFormData(nextFormData);
    setErrorMessage("");
    setErrors((prev) => ({
      ...prev,
      [fieldName]: validateField(fieldName, value, nextFormData),
      ...(fieldName === "password" || fieldName === "confirmPassword"
        ? {
            password: validateField("password", nextFormData.password, nextFormData),
            confirmPassword: validateField(
              "confirmPassword",
              nextFormData.confirmPassword,
              nextFormData
            ),
          }
        : {}),
    }));
  };

  const handleBlur = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof PatientFormData;

    setErrors((prev) => ({
      ...prev,
      [fieldName]: validateField(fieldName, value, formData),
    }));
  };

  const handlePhoneChange = (phone: string, countryCode: string) => {
    const nextFormData = {
      ...formData,
      countryCode,
      phone,
    };

    setFormData(nextFormData);
    setErrorMessage("");
    setErrors((prev) => ({
      ...prev,
      countryCode: validateField("countryCode", countryCode, nextFormData),
      phone: validateField("phone", phone, nextFormData),
    }));
  };

  const handlePhoneBlur = () => {
    setErrors((prev) => ({
      ...prev,
      phone: validateField("phone", formData.phone, formData),
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors = getFilledErrors(validatePatientForm(formData));

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setErrorMessage("Please correct the highlighted fields.");
      showToast("Please correct the highlighted fields.", "error");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setErrors({});

    try {
      const { confirmPassword: _confirmPassword, ...restFormData } = formData;
      const normalizedPhone = formData.phone.replace(formData.countryCode, "");
      const registrationPayload = {
        ...restFormData,
        phone: normalizedPhone,
      };

      const data = await registerPatient(registrationPayload);

      showToast(data.message || "Patient registered successfully.", "success");

      navigate("/verify-email", {
        replace: true,
        state: {
          registeredEmail: formData.email,
          successMessage:
            "Patient account created successfully. Please verify your email to continue.",
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to register patient";

      if (error instanceof PatientApiError) {
        setErrors(error.fieldErrors);
      }

      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
        <div className="flex flex-col justify-center bg-blue-600 p-8 text-white md:p-10">
          <h1 className="mb-4 text-3xl font-bold md:text-4xl">
            Patient Registration
          </h1>

          <p className="leading-7 text-blue-100">
            Create your patient account to manage appointments and healthcare
            services easily.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-xl bg-white/10 p-4">
              <h3 className="text-lg font-semibold">Quick Signup</h3>
              <p className="mt-1 text-sm text-blue-100">
                Enter your details and create your patient account.
              </p>
            </div>

            <div className="rounded-xl bg-white/10 p-4">
              <h3 className="text-lg font-semibold">Secure Access</h3>
              <p className="mt-1 text-sm text-blue-100">
                Your information is protected in the system.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <h2 className="mb-6 text-2xl font-bold text-slate-800">
            Fill Patient Details
          </h2>

          <p className="mb-6 text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Sign in here
            </Link>
          </p>

          {errorMessage && (
            <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  placeholder="John"
                  autoComplete="given-name"
                  maxLength={50}
                  className={getFieldClass(Boolean(errors.firstName))}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  placeholder="Doe"
                  autoComplete="family-name"
                  maxLength={50}
                  className={getFieldClass(Boolean(errors.lastName))}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                placeholder="john@gmail.com"
                autoComplete="email"
                className={getFieldClass(Boolean(errors.email))}
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
                onBlur={handleBlur}
                required
                placeholder="Enter password"
                autoComplete="new-password"
                minLength={6}
                className={getFieldClass(Boolean(errors.password))}
              />
              <p className="mt-1 text-xs text-slate-500">
                Use at least 6 characters with uppercase, lowercase, number, and
                special character.
              </p>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                placeholder="Confirm password"
                autoComplete="new-password"
                minLength={6}
                className={getFieldClass(Boolean(errors.confirmPassword))}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Phone Number
              </label>
              <PhoneNumberInput
                value={formData.phone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                error={errors.phone}
                defaultCountry="lk"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Birthday
                </label>
                <input
                  type="date"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={getFieldClass(Boolean(errors.birthday))}
                />
                {errors.birthday && (
                  <p className="mt-1 text-sm text-red-600">{errors.birthday}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={getFieldClass(Boolean(errors.gender))}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                onBlur={handleBlur}
                rows={3}
                placeholder="Enter address"
                maxLength={255}
                className={getFieldClass(Boolean(errors.address))}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Country
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                autoComplete="country-name"
                className={getFieldClass(Boolean(errors.country))}
              >
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
            >
              {loading ? "Registering..." : "Register Patient"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
