import { useEffect, useState } from "react";
import {
  getPatientPaymentHistory,
  getDoctorPaymentHistory,
  getReceiptUrl,
  type Payment,
} from "../../services/paymentApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  FAILED: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  REFUNDED: "bg-purple-100 text-purple-700",
};

export default function PaymentHistoryPage() {
  const auth = getStoredTelemedicineAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadHistory() {
      if (!auth.userId) {
        setErrorMessage("You must be logged in to view payment history.");
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage("");

        if (auth.role === "doctor" && auth.doctorProfileId && auth.token) {
          const data = await getDoctorPaymentHistory(
            auth.doctorProfileId,
            auth.token
          );
          setPayments(data.payments);
          setTotalEarnings(data.totalEarnings);
        } else {
          const data = await getPatientPaymentHistory(auth.userId);
          setPayments(data.payments);
        }
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load payment history."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [auth.userId, auth.role, auth.doctorProfileId]);

  const successCount = payments.filter((p) => p.status === "SUCCESS").length;
  const totalPaid = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Payment History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {auth.role === "doctor"
              ? "All payments received for your appointments."
              : "All payments made for your appointments."}
          </p>
        </div>

        {!isLoading && !errorMessage && payments.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm text-slate-500">Total Transactions</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{payments.length}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm text-slate-500">Successful Payments</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{successCount}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm text-slate-500">
                {auth.role === "doctor" ? "Total Earnings" : "Total Paid"}
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-600">
                LKR {(totalEarnings ?? totalPaid).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="mt-6 rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
            Loading payment history...
          </div>
        ) : payments.length === 0 && !errorMessage ? (
          <div className="mt-6 rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-100">
            <h3 className="text-xl font-bold text-slate-900">No payments found</h3>
            <p className="mt-2 text-sm text-slate-500">
              You have not made any payments yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-4">Order ID</th>
                    <th className="px-5 py-4">Appointment</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Method</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">
                        {payment.orderId.slice(0, 16)}…
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">
                        {payment.appointmentId.slice(0, 10)}…
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {payment.currency} {payment.amount.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {payment.payhereMethod || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            STATUS_STYLES[payment.status] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {new Date(payment.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4">
                        {payment.status === "SUCCESS" ? (
                          <a
                            href={getReceiptUrl(payment.orderId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
