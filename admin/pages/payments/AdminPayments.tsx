import { useEffect, useState } from "react";
import { useAuth } from "../../src/context/AuthContext";
import { APPOINTMENT_API_URL, PAYMENT_API_URL } from "../../src/config/api";

type RefundAppointment = {
  _id: string;
  patientId: string;
  patientName?: string;
  doctorName: string;
  specialization: string;
  appointmentDate: string;
  appointmentTime: string;
  rescheduledDate: string | null;
  rescheduledTime: string | null;
  paymentStatus: string;
  rescheduleStatus: string;
};

type Payment = {
  _id: string;
  orderId: string;
  patientId: string;
  doctorId: string;
  appointmentId: string;
  amount: number;
  currency: string;
  status: string;
  payhereMethod: string | null;
  createdAt: string;
};

type Tab = "refund-queue" | "all-payments";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timeString: string) {
  const [hours = "00", minutes = "00"] = timeString.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getPaymentStatusStyles(status: string) {
  switch (status.toUpperCase()) {
    case "SUCCESS":  return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "REFUNDED": return "bg-amber-50 text-amber-700 border-amber-200";
    case "FAILED":   return "bg-rose-50 text-rose-700 border-rose-200";
    default:         return "bg-slate-100 text-slate-500 border-slate-200";
  }
}

export default function AdminPayments() {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("refund-queue");

  // Refund queue state
  const [refundQueue, setRefundQueue] = useState<RefundAppointment[]>([]);
  const [refundLoading, setRefundLoading] = useState(true);
  const [refundError, setRefundError] = useState("");
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState("");

  // All payments state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Load refund queue on mount
  useEffect(() => {
    async function loadRefundQueue() {
      if (!auth?.token) return;

      try {
        const res = await fetch(`${APPOINTMENT_API_URL}/admin/refund-queue`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load refund queue");
        setRefundQueue(Array.isArray(data) ? data : []);
      } catch (error: unknown) {
        setRefundError(error instanceof Error ? error.message : "Failed to load refund queue");
      } finally {
        setRefundLoading(false);
      }
    }

    loadRefundQueue();
  }, [auth?.token]);

  // Load all payments when tab switches
  useEffect(() => {
    if (activeTab !== "all-payments" || !auth?.token) return;

    async function loadPayments() {
      setPaymentsLoading(true);
      setPaymentsError("");

      try {
        const res = await fetch(`${PAYMENT_API_URL}/all`, {
          headers: { Authorization: `Bearer ${auth!.token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load payments");
        setPayments(Array.isArray(data.payments) ? data.payments : []);
        setTotalRevenue(data.totalRevenue ?? 0);
      } catch (error: unknown) {
        setPaymentsError(error instanceof Error ? error.message : "Failed to load payments");
      } finally {
        setPaymentsLoading(false);
      }
    }

    loadPayments();
  }, [activeTab, auth?.token]);

  async function handleProcessRefund(appointment: RefundAppointment) {
    if (!auth?.token) return;

    try {
      setProcessingRefundId(appointment._id);
      setRefundError("");
      setRefundSuccess("");

      // Step 1 — get payment by appointmentId to find orderId
      const paymentRes = await fetch(
        `${PAYMENT_API_URL}/appointment/${appointment._id}`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      const paymentData = await paymentRes.json();
      if (!paymentRes.ok) throw new Error(paymentData.message || "Payment not found");

      const orderId: string = paymentData.orderId;

      // Step 2 — process refund
      const refundRes = await fetch(`${PAYMENT_API_URL}/${orderId}/refund`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const refundData = await refundRes.json();
      if (!refundRes.ok) throw new Error(refundData.message || "Refund failed");

      // Remove from queue
      setRefundQueue((current) => current.filter((a) => a._id !== appointment._id));
      setRefundSuccess(
        `Refund processed successfully for ${appointment.patientName ?? "patient"}.`
      );
    } catch (error: unknown) {
      setRefundError(error instanceof Error ? error.message : "Refund failed");
    } finally {
      setProcessingRefundId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800">Payments</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage refunds and track all platform payment transactions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("refund-queue")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "refund-queue"
              ? "bg-rose-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Refund Queue
          {refundQueue.length > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
              {refundQueue.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("all-payments")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "all-payments"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Payments
        </button>
      </div>

      {/* Refund Queue Tab */}
      {activeTab === "refund-queue" && (
        <div className="space-y-4">
          {refundError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {refundError}
            </div>
          )}
          {refundSuccess && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {refundSuccess}
            </div>
          )}

          {refundLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
              Loading refund queue...
            </div>
          ) : refundQueue.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-500">No pending refunds</p>
              <p className="mt-1 text-xs text-slate-400">
                Refunds appear here when a patient rejects a doctor's reschedule proposal.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-base font-semibold text-slate-800">
                  Pending Refunds ({refundQueue.length})
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Patients who rejected a rescheduled appointment. Verify and process refund.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {refundQueue.map((appointment) => (
                  <div key={appointment._id} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {appointment.patientName ?? `Patient ${appointment.patientId.slice(-6)}`}
                        </span>
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                          Reschedule Rejected
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">
                        Dr. {appointment.doctorName} — {appointment.specialization}
                      </p>

                      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                        <div>
                          <span className="font-medium text-slate-500">Original: </span>
                          {formatDate(appointment.appointmentDate)} at {formatTime(appointment.appointmentTime)}
                        </div>
                        {appointment.rescheduledDate && appointment.rescheduledTime && (
                          <div>
                            <span className="font-medium text-slate-500">Proposed: </span>
                            {formatDate(appointment.rescheduledDate)} at {formatTime(appointment.rescheduledTime)}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleProcessRefund(appointment)}
                      disabled={processingRefundId === appointment._id}
                      className="shrink-0 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processingRefundId === appointment._id
                        ? "Processing..."
                        : "Process Refund"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Payments Tab */}
      {activeTab === "all-payments" && (
        <div className="space-y-4">
          {paymentsError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {paymentsError}
            </div>
          )}

          {/* Revenue summary */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Total Platform Revenue
            </p>
            <p className="mt-1 text-3xl font-bold text-emerald-700">
              LKR {totalRevenue.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-emerald-600">from successful payments only</p>
          </div>

          {paymentsLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
              Loading payments...
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Order ID</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Method</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                          No payment records found.
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment._id} className="transition hover:bg-slate-50">
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {payment.orderId}
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            {formatDate(payment.createdAt)}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            {payment.currency} {payment.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 capitalize text-slate-600">
                            {payment.payhereMethod ?? "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPaymentStatusStyles(payment.status)}`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
