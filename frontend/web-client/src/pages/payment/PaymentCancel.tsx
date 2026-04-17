import { Link, useSearchParams } from "react-router-dom";

export default function PaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <section className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
            <svg
              className="h-7 w-7 text-rose-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Payment Cancelled</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your payment was cancelled. No charge has been made.
          </p>

          {orderId && (
            <p className="mt-3 text-xs text-slate-400">
              Order reference:{" "}
              <span className="font-mono text-slate-500">{orderId}</span>
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/appointments/patient"
              className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Back to Appointments
            </Link>
            <Link
              to="/payment/history"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View Payment History
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
