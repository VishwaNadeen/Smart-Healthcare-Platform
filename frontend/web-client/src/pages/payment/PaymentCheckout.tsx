import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { initiatePayment, type PayHereParams } from "../../services/paymentApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

type CheckoutState = {
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  amount: number;
  appointmentDate: string;
  appointmentTime: string;
};

export default function PaymentCheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getStoredTelemedicineAuth();
  const formRef = useRef<HTMLFormElement>(null);

  const state = location.state as CheckoutState | null;

  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");


  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentParams, setPaymentParams] = useState<(PayHereParams & { checkoutUrl: string }) | null>(null);

  useEffect(() => {
    if (!state) {
      navigate("/appointments/patient", { replace: true });
    }
  }, [state, navigate]);

  useEffect(() => {
    if (paymentParams && formRef.current) {
      formRef.current.submit();
    }
  }, [paymentParams]);

  if (!state) return null;

async function handleProceedToPayment() {
  if (!auth.userId || !auth.email || !auth.username) {
    setErrorMessage("You must be logged in to make a payment.");
    return;
  }

  if (!phone.trim()) {
    setPhoneError("Please enter your phone number.");
    return;
  }

  setPhoneError("");

  const nameParts = auth.username.trim().split(" ");
  const firstName = nameParts[0] || auth.username;
  const lastName = nameParts.slice(1).join(" ") || "-";

  try {
    setIsLoading(true);
    setErrorMessage("");

    const result = await initiatePayment({
      patientId: auth.userId,
      doctorId: state!.doctorId,
      doctorName: state!.doctorName,       // ADDED: pass to backend so it's stored
      specialization: state!.specialization, // ADDED: pass to backend so it's stored
      appointmentId: state!.appointmentId,
      amount: state!.amount,
      firstName,
      lastName,
      email: auth.email,
      phone: phone.trim(),
    });

    setPaymentParams({ ...result.params, checkoutUrl: result.checkoutUrl });
  } catch (error: unknown) {
    setErrorMessage(
      error instanceof Error ? error.message : "Payment initiation failed."
    );
    setIsLoading(false);
  }
}

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">Payment Checkout</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review your appointment details before proceeding to PayHere.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Appointment Summary
            </h2>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Doctor</span>
                <span className="font-medium text-slate-800">{state.doctorName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Specialization</span>
                <span className="font-medium text-slate-800">{state.specialization}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Date</span>
                <span className="font-medium text-slate-800">{state.appointmentDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Time</span>
                <span className="font-medium text-slate-800">{state.appointmentTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Appointment ID</span>
                <span className="font-mono text-xs text-slate-600">{state.appointmentId}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Contact Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0771234567"
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 disabled:opacity-60"
            />
            {phoneError && (
              <p className="mt-1 text-xs text-rose-600">{phoneError}</p>
            )}
          </div>


            <div className="mt-5 border-t border-slate-200 pt-4 flex justify-between items-center">
              <span className="text-base font-semibold text-slate-700">Total Amount</span>
              <span className="text-xl font-bold text-blue-600">
                LKR {state.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleProceedToPayment}
              disabled={isLoading}
              className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isLoading ? "Redirecting to PayHere..." : "Pay with PayHere"}
            </button>
            <button
              onClick={() => navigate(-1)}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            You will be redirected to PayHere to complete the payment securely.
          </p>
        </div>
      </div>

      {paymentParams && (
        <form
          ref={formRef}
          method="POST"
          action={paymentParams.checkoutUrl}
          style={{ display: "none" }}
        >
          {Object.entries(paymentParams).map(([key, value]) => {
            if (key === "checkoutUrl") return null;
            return <input key={key} type="hidden" name={key} value={String(value)} />;
          })}
        </form>
      )}
    </section>
  );
}
