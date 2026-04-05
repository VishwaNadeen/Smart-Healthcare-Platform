import { useEffect, useState } from "react";
import {
  getNotificationHistory,
  type Notification,
  type NotificationType,
} from "../../services/notificationApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

const TYPE_LABELS: Record<NotificationType, string> = {
  APPOINTMENT_BOOKED: "Appointment Booked",
  APPOINTMENT_RESCHEDULED: "Appointment Rescheduled",
  APPOINTMENT_CANCELLED: "Appointment Cancelled",
  PAYMENT_SUCCESS: "Payment Successful",
  CONSULTATION_COMPLETED: "Consultation Completed",
};

const TYPE_STYLES: Record<NotificationType, string> = {
  APPOINTMENT_BOOKED: "bg-blue-100 text-blue-700",
  APPOINTMENT_RESCHEDULED: "bg-amber-100 text-amber-700",
  APPOINTMENT_CANCELLED: "bg-rose-100 text-rose-700",
  PAYMENT_SUCCESS: "bg-emerald-100 text-emerald-700",
  CONSULTATION_COMPLETED: "bg-purple-100 text-purple-700",
};

const STATUS_STYLES: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  FAILED: "bg-rose-100 text-rose-700",
};

const CHANNEL_ICONS: Record<string, string> = {
  EMAIL: "✉",
  SMS: "💬",
  BOTH: "✉ + 💬",
};

export default function NotificationHistoryPage() {
  const auth = getStoredTelemedicineAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [filter, setFilter] = useState<NotificationType | "ALL">("ALL");

  useEffect(() => {
    async function loadHistory() {
      if (!auth.userId) {
        setErrorMessage("You must be logged in to view notifications.");
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage("");
        const data = await getNotificationHistory(auth.userId);
        setNotifications(data.notifications ?? []);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load notification history."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [auth.userId]);

  const filtered =
    filter === "ALL"
      ? notifications
      : notifications.filter((n) => n.type === filter);

  const sentCount = notifications.filter((n) => n.status === "SENT").length;

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Email and SMS notifications sent to your account.
          </p>
        </div>

        {!isLoading && !errorMessage && notifications.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {notifications.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm text-slate-500">Sent</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{sentCount}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 col-span-2 sm:col-span-1">
              <p className="text-sm text-slate-500">Failed</p>
              <p className="mt-1 text-2xl font-bold text-rose-500">
                {notifications.length - sentCount}
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {!isLoading && notifications.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {(["ALL", "APPOINTMENT_BOOKED", "APPOINTMENT_CANCELLED", "PAYMENT_SUCCESS", "CONSULTATION_COMPLETED", "APPOINTMENT_RESCHEDULED"] as const).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    filter === type
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {type === "ALL" ? "All" : TYPE_LABELS[type]}
                </button>
              )
            )}
          </div>
        )}

        {isLoading ? (
          <div className="mt-6 rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
            Loading notifications...
          </div>
        ) : filtered.length === 0 && !errorMessage ? (
          <div className="mt-6 rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-100">
            <h3 className="text-xl font-bold text-slate-900">No notifications found</h3>
            <p className="mt-2 text-sm text-slate-500">
              {filter === "ALL"
                ? "You have not received any notifications yet."
                : "No notifications of this type found."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {filtered.map((notification) => (
              <div
                key={notification._id}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        TYPE_STYLES[notification.type]
                      }`}
                    >
                      {TYPE_LABELS[notification.type]}
                    </span>
                    <span className="text-sm text-slate-400">
                      {CHANNEL_ICONS[notification.channel] ?? notification.channel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[notification.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {notification.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(notification.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {notification.subject && (
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    {notification.subject}
                  </p>
                )}

                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  {notification.message}
                </p>

                {notification.status === "FAILED" && notification.errorMessage && (
                  <p className="mt-2 text-xs text-rose-500">
                    Error: {notification.errorMessage}
                  </p>
                )}

                {(notification.metadata?.appointmentId ||
                  notification.metadata?.orderId) && (
                  <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
                    {notification.metadata.appointmentId && (
                      <span className="text-xs text-slate-400">
                        Appointment:{" "}
                        <span className="font-mono text-slate-500">
                          {notification.metadata.appointmentId}
                        </span>
                      </span>
                    )}
                    {notification.metadata.orderId && (
                      <span className="text-xs text-slate-400">
                        Order:{" "}
                        <span className="font-mono text-slate-500">
                          {notification.metadata.orderId}
                        </span>
                      </span>
                    )}
                    {notification.metadata.amount != null && (
                      <span className="text-xs text-slate-400">
                        Amount:{" "}
                        <span className="font-semibold text-slate-600">
                          LKR {notification.metadata.amount.toFixed(2)}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
