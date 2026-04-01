import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/ToastProvider";
import { AUTH_API_URL } from "../../config/api";
import {
  requestPasswordResetOtp,
} from "../../services/authApi";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function isValidOtp(value: string) {
    return /^[0-9]{4,8}$/.test(value.trim());
  }

  const requestOtp = async (nextStep: "request" | "reset") => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      const message = "Email is required.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      const message = "Enter a valid email address.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setError("");
    setMessage("");

    try {
      const result = await requestPasswordResetOtp({ email: trimmedEmail });
      setStep(nextStep);
      setMessage(result.message || "OTP sent to your account.");
      showToast(result.message || "OTP sent to your account.", "success");
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      showToast(message, "error");
      return false;
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await requestOtp("reset");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError("");

    try {
      await requestOtp("reset");
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedOtp = otp.trim();
    const trimmedNewPassword = newPassword.trim();

    if (!trimmedEmail) {
      const message = "Email is required.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      const message = "Enter a valid email address.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (!trimmedOtp) {
      const message = "OTP is required.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (!isValidOtp(trimmedOtp)) {
      const message = "OTP must contain only digits and be 4 to 8 characters long.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (!trimmedNewPassword) {
      const message = "New password is required.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (trimmedNewPassword.length < 6 || trimmedNewPassword.length > 100) {
      const message = "New password must be between 6 and 100 characters.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${AUTH_API_URL}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: trimmedEmail,
          otp: trimmedOtp,
          newPassword: trimmedNewPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      showToast("Password reset successful. You can login now.", "success");
      setOtp("");
      setNewPassword("");
      navigate("/login", {
        replace: true,
        state: {
          registeredEmail: trimmedEmail,
          successMessage: "Password reset successful. You can login now.",
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800">Forgot Password</h1>
          <p className="mt-2 text-slate-500">
            {step === "request"
              ? "Enter your auth account email to receive an OTP"
              : "Enter your OTP and set a new password"}
          </p>
        </div>

        <form onSubmit={step === "request" ? handleRequestOtp : handleResetPassword} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {step === "reset" && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">OTP</label>
                <input
                  type="text"
                  name="otp"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {error && <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message && <div className="rounded-lg bg-green-100 px-4 py-3 text-sm text-green-700">{message}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Please wait..." : step === "request" ? "Send OTP" : "Reset Password"}
          </button>

          <p className="text-center text-sm text-slate-500">
            Back to{" "}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Login
            </Link>
          </p>
        </form>

        {step === "reset" && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
            <p className="text-sm text-slate-600">
              Didn&apos;t receive the OTP?
            </p>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending || !email.trim()}
              className="mt-3 w-full rounded-xl border border-blue-200 bg-white py-3 font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
