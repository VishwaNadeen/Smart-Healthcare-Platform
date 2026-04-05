import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getPaymentStatus, type Payment } from "../../services/paymentApi";
import { getReceiptUrl } from "../../services/paymentApi";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!orderId) {
      setErrorMessage("No order ID found in the URL.");
      setIsLoading(false);
      return;
    }

    async function fetchPayment() {
      try {
        const data = await getPaymentStatus(orderId!);
        setPayment(data);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load payment details."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchPayment();
  }, [orderId]);

  const isSuccess = payment?.status === "SUCCESS";

  return (
    <section className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {isLoading ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center text-sm text-slate-500">
            Verifying payment...
          </div>
        ) : errorMessage ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
              <svg className="h-7 w-7 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-500">{errorMessage}</p>
            <Link
              to="/appointments/patient"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to Appointments
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                isSuccess ? "bg-emerald-100" : "bg-amber-100"
              }`}
            >
              {isSuccess ? (
                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                </svg>
              )}
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              {isSuccess ? "Payment Successful!" : "Payment Pending"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {isSuccess
                ? "Your appointment payment has been confirmed."
                : "Your payment is being processed. Please wait a moment."}
            </p>

            {payment && (
              <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-left ring-1 ring-slate-200 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Order ID</span>
                  <span className="font-mono text-xs text-slate-700">{payment.orderId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-800">
                    {payment.currency} {payment.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isSuccess
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>
                {payment.payherePaymentId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Transaction ID</span>
                    <span className="font-mono text-xs text-slate-700">
                      {payment.payherePaymentId}
                    </span>
                  </div>
                )}
                {payment.payhereMethod && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Payment Method</span>
                    <span className="text-slate-700">{payment.payhereMethod}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {isSuccess && payment && (
                <a
                  href={getReceiptUrl(payment.orderId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Download Receipt
                </a>
              )}
              <Link
                to="/appointments/patient"
                className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Back to Appointments
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
