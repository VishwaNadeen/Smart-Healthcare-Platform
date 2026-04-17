import { useEffect, useState } from "react";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";
import {
  getDoctorPaymentHistory,
  getReceiptUrl,
  type Payment,
} from "../../services/paymentApi";
import { getDoctorAppointments, type Appointment } from "../../services/appointmentApi";
import PageLoading from "../../components/common/PageLoading";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number, currency = "LKR") {
  return `${currency} ${amount.toFixed(2)}`;
}

function getStatusStyles(status: Payment["status"]) {
  switch (status) {
    case "SUCCESS":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "REFUNDED":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "FAILED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "CANCELLED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-500 border-slate-200";
  }
}

export default function DoctorEarningsPage() {
  const auth = getStoredTelemedicineAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [patientNameMap, setPatientNameMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadEarnings() {
      const doctorId = auth.doctorProfileId;
      const token = auth.token;

      if (!doctorId || !token) {
        setErrorMessage("Doctor profile not found. Please log in again.");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch payments and appointments in parallel
        const [paymentData, appointments] = await Promise.all([
          getDoctorPaymentHistory(doctorId, token),
          getDoctorAppointments(token, doctorId),
        ]);

        setPayments(paymentData.payments);
        setTotalEarnings(paymentData.totalEarnings);

        // Build appointmentId → patientName lookup map
        const nameMap: Record<string, string> = {};
        appointments.forEach((appt: Appointment) => {
          if (appt.patientName) {
            nameMap[appt._id] = appt.patientName;
          }
        });
        setPatientNameMap(nameMap);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load earnings."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadEarnings();
  }, [auth.doctorProfileId]);

  if (isLoading) {
    return <PageLoading message="Loading earnings..." />;
  }

  const successPayments = payments.filter((p) => p.status === "SUCCESS");
  const refundedCount = payments.filter((p) => p.status === "REFUNDED").length;

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Earnings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your payment history from completed appointments
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {/* Summary Cards */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Total Earnings
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              LKR {totalEarnings.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-emerald-600">
              from successful payments only
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Paid Appointments
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {successPayments.length}
            </p>
            <p className="mt-1 text-xs text-blue-600">
              successfully completed
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Refunded
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {refundedCount}
            </p>
            <p className="mt-1 text-xs text-amber-600">
              refunded appointments
            </p>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-800">
              Payment History
            </h2>
          </div>

          {payments.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              No payment records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Method
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {patientNameMap[payment.appointmentId] ?? (
                          <span className="font-mono text-xs text-slate-400">
                            {payment.patientId.slice(-8)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-600">
                        {payment.payhereMethod ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusStyles(payment.status)}`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {payment.status === "SUCCESS" ? (
                          <a
                            href={getReceiptUrl(payment.orderId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-blue-600 hover:underline"
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
          )}
        </div>
      </div>
    </section>
  );
}
