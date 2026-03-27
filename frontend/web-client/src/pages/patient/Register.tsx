import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { registerPatient } from "../../services/patientApi";

type PatientFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  countryCode: string;
  phone: string;
  birthday: string;
  gender: "" | "male" | "female" | "other";
  address: string;
  country: string;
};

type FormErrors = Partial<Record<keyof PatientFormData, string>>;

function validatePatientForm(data: PatientFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.firstName.trim()) {
    errors.firstName = "First name is required.";
  } else if (!/^[A-Za-z\s'-]{2,50}$/.test(data.firstName.trim())) {
    errors.firstName = "Enter a valid first name.";
  }

  if (!data.lastName.trim()) {
    errors.lastName = "Last name is required.";
  } else if (!/^[A-Za-z\s'-]{2,50}$/.test(data.lastName.trim())) {
    errors.lastName = "Enter a valid last name.";
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

  if (!data.countryCode.trim()) {
    errors.countryCode = "Country code is required.";
  } else if (!/^\+\d{1,4}$/.test(data.countryCode.trim())) {
    errors.countryCode = "Use format like +94.";
  }

  if (!data.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!/^\d{7,15}$/.test(data.phone.trim())) {
    errors.phone = "Enter a valid phone number.";
  }

  if (!data.birthday) {
    errors.birthday = "Birthday is required.";
  } else {
    const birthday = new Date(data.birthday);
    const today = new Date();

    if (Number.isNaN(birthday.getTime())) {
      errors.birthday = "Enter a valid birthday.";
    } else if (birthday > today) {
      errors.birthday = "Birthday cannot be in the future.";
    }
  }

  if (!data.gender) {
    errors.gender = "Please select a gender.";
  }

  if (!data.country.trim()) {
    errors.country = "Country is required.";
  } else if (data.country.trim().length < 2) {
    errors.country = "Enter a valid country.";
  }

  if (data.address.trim().length > 250) {
    errors.address = "Address is too long.";
  }

  return errors;
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
  const location = useLocation();
  const locationState =
    typeof location.state === "object" && location.state !== null
      ? (location.state as {
          successMessage?: string;
        })
      : null;
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    countryCode: "+94",
    phone: "",
    birthday: "",
    gender: "",
    address: "",
    country: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(
    locationState?.successMessage || ""
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validatePatientForm(formData);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSuccessMessage("");
      setErrorMessage("Please correct the highlighted fields.");
      return;
    }

    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const data = await registerPatient(formData);
      setSuccessMessage(data.message || "Patient registered successfully");

      navigate("/verify-email", {
        replace: true,
        state: {
          registeredEmail: formData.email,
          successMessage:
            "Patient account created successfully. Please verify your email to continue.",
        },
      });
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to register patient"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl grid grid-cols-1 md:grid-cols-2">
        <div className="bg-blue-600 p-8 md:p-10 text-white flex flex-col justify-center">
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
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in here
            </Link>
          </p>

          {successMessage && (
            <div className="mb-4 rounded-lg bg-green-100 px-4 py-3 text-green-700">
              {successMessage}
            </div>
          )}

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
                  required
                  placeholder="John"
                  className={getFieldClass(Boolean(errors.firstName))}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
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
                  required
                  placeholder="Doe"
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
                required
                placeholder="john@gmail.com"
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
                required
                placeholder="Enter password"
                className={getFieldClass(Boolean(errors.password))}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Country Code
                </label>
                <input
                  type="text"
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleChange}
                  required
                  placeholder="+94"
                  className={getFieldClass(Boolean(errors.countryCode))}
                />
                {errors.countryCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.countryCode}</p>
                )}
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
                  required
                  placeholder="771234567"
                  className={getFieldClass(Boolean(errors.phone))}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
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
                rows={3}
                placeholder="Enter address"
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
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                placeholder="Sri Lanka"
                className={getFieldClass(Boolean(errors.country))}
              />
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
