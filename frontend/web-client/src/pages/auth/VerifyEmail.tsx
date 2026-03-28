import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/ToastProvider";
import { useLocationToast } from "../../hooks/useLocationToast";
import {
  requestEmailVerification,
  verifyEmail,
} from "../../services/authApi";

type VerifyFormState = {
  email: string;
  otp: string;
};

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  useLocationToast();
  const locationState =
    typeof location.state === "object" && location.state !== null
      ? (location.state as {
          registeredEmail?: string;
          successMessage?: string;
        })
      : null;
  const [form, setForm] = useState<VerifyFormState>({
    email: locationState?.registeredEmail || "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    "Enter the verification code sent to your email."
  );

  function updateField<K extends keyof VerifyFormState>(
    key: K,
    value: VerifyFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await verifyEmail(form);
      showToast(result.message, "success");

      navigate("/login", {
        replace: true,
        state: {
          registeredEmail: form.email,
          successMessage: `${result.message}. You can sign in now.`,
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to verify email";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");

    try {
      const result = await requestEmailVerification({ email: form.email });
      setMessage(result.message);
      showToast(result.message, "info");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to resend code";
      setError(message);
      showToast(message, "error");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-100 px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Verify Email</h1>
          <p className="mt-2 text-sm text-slate-500">
            Confirm your account before you sign in.
          </p>
        </div>

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
              required
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label
              htmlFor="otp"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              value={form.otp}
              onChange={(event) => updateField("otp", event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {message && (
            <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || !form.email.trim()}
          className="mt-4 w-full rounded-2xl border border-blue-200 py-3 font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-70"
        >
          {resending ? "Sending..." : "Resend Verification Code"}
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Back to{" "}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
