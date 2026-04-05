import { useEffect, useState } from "react";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"request" | "otp" | "reset">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setError("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [error]);

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function isValidOtp(value: string) {
    return /^[0-9]{4,8}$/.test(value.trim());
  }

  function isValidPassword(value: string) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,100}$/.test(
      value
    );
  }

  const requestOtp = async (nextStep: "otp" | "reset") => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      const message = "Email is required.";
      setError(message);
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      const message = "Enter a valid email address.";
      setError(message);
      return;
    }

    setError("");
    try {
      const result = await requestPasswordResetOtp({ email: trimmedEmail });
      setStep(nextStep);
      showToast(result.message || "OTP sent to your account.", "success");
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      return false;
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await requestOtp("otp");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedOtp = otp.trim();

    if (!trimmedOtp) {
      const message = "OTP is required.";
      setError(message);
      return;
    }

    if (!isValidOtp(trimmedOtp)) {
      const message = "OTP must contain only digits and be 4 to 8 characters long.";
      setError(message);
      return;
    }

    setError("");
    setStep("reset");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedOtp = otp.trim();
    const trimmedNewPassword = newPassword;
    const trimmedConfirmPassword = confirmPassword;

    if (!trimmedEmail) {
      const message = "Email is required.";
      setError(message);
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      const message = "Enter a valid email address.";
      setError(message);
      return;
    }

    if (!trimmedOtp) {
      const message = "OTP is required.";
      setError(message);
      return;
    }

    if (!isValidOtp(trimmedOtp)) {
      const message = "OTP must contain only digits and be 4 to 8 characters long.";
      setError(message);
      return;
    }

    if (!trimmedNewPassword) {
      const message = "New password is required.";
      setError(message);
      return;
    }

    if (trimmedNewPassword.length < 6) {
      const message = "New password must be at least 6 characters.";
      setError(message);
      return;
    }

    if (trimmedNewPassword.length > 100) {
      const message = "New password must be 100 characters or fewer.";
      setError(message);
      return;
    }

    if (!isValidPassword(trimmedNewPassword)) {
      const message =
        "New password must include uppercase, lowercase, number, and special character.";
      setError(message);
      return;
    }

    if (!trimmedConfirmPassword) {
      const message = "Confirm password is required.";
      setError(message);
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      const message = "Passwords do not match.";
      setError(message);
      return;
    }

    setLoading(true);
    setError("");

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

      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
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
              : step === "otp"
                ? "Enter the OTP sent to your email"
                : "Set your new password"}
          </p>
        </div>

        <form
          onSubmit={
            step === "request"
              ? handleRequestOtp
              : step === "otp"
                ? handleOtpContinue
                : handleResetPassword
          }
          className="space-y-5"
        >
          {step !== "reset" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {step === "otp" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">OTP</label>
              <input
                type="text"
                name="otp"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {step === "reset" && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) {
                      setError("");
                    }
                  }}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Use at least 6 characters with uppercase, lowercase, number, and
                  special character.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) {
                      setError("");
                    }
                  }}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {error && <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : step === "request"
                ? "Send OTP"
                : step === "otp"
                  ? "Continue"
                  : "Reset Password"}
          </button>

          <p className="text-center text-sm text-slate-500">
            Back to{" "}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Login
            </Link>
          </p>
        </form>

      </div>
    </div>
  );
}
