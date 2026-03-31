import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/ToastProvider";
import { useLocationToast } from "../../hooks/useLocationToast";
import { loginUser } from "../../services/authApi";
import { getCurrentPatientProfile } from "../../services/patientApi";
import {
  clearTelemedicineAuth,
  getPostLoginPath,
  saveTelemedicineAuth,
} from "../../utils/telemedicineAuth";

const PATIENT_PROFILE_NAME_KEY = "patientProfileName";
const PATIENT_PROFILE_IMAGE_KEY = "patientProfileImage";
const DOCTOR_PROFILE_NAME_KEY = "doctorProfileName";
const DOCTOR_PROFILE_IMAGE_KEY = "doctorProfileImage";

function clearStoredProfiles() {
  localStorage.removeItem(PATIENT_PROFILE_NAME_KEY);
  localStorage.removeItem(PATIENT_PROFILE_IMAGE_KEY);
  localStorage.removeItem(DOCTOR_PROFILE_NAME_KEY);
  localStorage.removeItem(DOCTOR_PROFILE_IMAGE_KEY);
}

type LoginFormState = {
  email: string;
  password: string;
};

function validateLoginForm(data: LoginFormState) {
  const trimmedEmail = data.email.trim();
  const trimmedPassword = data.password.trim();

  if (!trimmedEmail) {
    return "Email is required.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return "Enter a valid email address.";
  }

  if (!trimmedPassword) {
    return "Password is required.";
  }

  if (trimmedPassword.length < 6 || trimmedPassword.length > 100) {
    return "Password must be between 6 and 100 characters.";
  }

  return "";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  useLocationToast();
  const locationState =
    typeof location.state === "object" && location.state !== null
      ? (location.state as {
          from?: { pathname?: string };
          registeredEmail?: string;
          successMessage?: string;
          verificationRequired?: boolean;
        })
      : null;

  const [form, setForm] = useState<LoginFormState>({
    email: locationState?.registeredEmail || "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateLoginForm(form);

    if (validationMessage) {
      setError(validationMessage);
      showToast(validationMessage, "error");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await loginUser(form);

      clearStoredProfiles();

      saveTelemedicineAuth({
        token: result.token,
        id: result.id,
        username: result.username,
        email: result.email,
        role: result.role,
        doctorProfileId: result.doctorProfileId,
      });

      if (result.role === "patient") {
        try {
          await getCurrentPatientProfile(result.token);
        } catch (profileError) {
          clearTelemedicineAuth();

          const message =
            profileError instanceof Error ? profileError.message.toLowerCase() : "";

          if (
            message.includes("not found") ||
            message.includes("deleted") ||
            message.includes("no patient")
          ) {
            throw new Error(
              "This patient account was deleted or no longer exists."
            );
          }

          throw profileError;
        }
      }

      showToast("Login successful.", "success");
      navigate(getPostLoginPath(result.role, locationState?.from?.pathname), {
        replace: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";

      if (
        message.toLowerCase().includes("verify your email") &&
        form.email.trim()
      ) {
        showToast("Please verify your email before logging in.", "info");
        navigate("/verify-email", {
          replace: true,
          state: {
            registeredEmail: form.email.trim(),
            successMessage:
              "Your account is registered, but email verification is still pending.",
          },
        });
        return;
      }

      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof LoginFormState>(
    key: K,
    value: LoginFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-100 px-4 py-12">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-blue-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-blue-100">
              Smart Healthcare
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-tight">
              Sign in to manage consultations, sessions, and care plans.
            </h1>
            <p className="mt-4 max-w-md text-blue-100">
              Use your doctor or patient account to continue into the
              telemedicine workspace.
            </p>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <p className="text-sm text-blue-100">What you can do after login</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>Access role-based doctor and patient session lists.</li>
              <li>Join waiting rooms and consultations with stored auth data.</li>
              <li>Continue with backend-issued role and token details.</li>
            </ul>
          </div>
        </section>

        <section className="flex items-center p-6 sm:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Login</h2>
              <p className="mt-2 text-sm text-slate-500">
                Enter the email and password from the auth service.
              </p>
            </div>

            {locationState?.verificationRequired && form.email && (
              <div className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Verify your email before logging in.{" "}
                <Link
                  to="/verify-email"
                  state={{
                    registeredEmail: form.email,
                  }}
                  className="font-semibold text-amber-900 underline"
                >
                  Verify now
                </Link>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Need an account?{" "}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Register here
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
