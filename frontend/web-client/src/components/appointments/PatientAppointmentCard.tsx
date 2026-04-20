import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Appointment } from "../../services/appointmentApi";

type PatientAppointmentCardProps = {
  appointment: Appointment;
  onCancel: (appointmentId: string) => void;
  isCancelling: boolean;
  onCompletePayment: (appointment: Appointment) => void;
  isCompletingPayment: boolean;
  onRescheduleResponse: (
    appointmentId: string,
    response: "approved" | "rejected"
  ) => void;
  isRespondingToReschedule: boolean;
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timeString: string) {
  const [hours = "00", minutes = "00"] = timeString.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}


function getStatusTextColor(status: Appointment["status"]) {
  switch (status) {
    case "pending":
      return "text-amber-700";
    case "confirmed":
      return "text-emerald-700";
    case "completed":
      return "text-blue-700";
    case "cancelled":
      return "text-rose-700";
    default:
      return "text-slate-700";
  }
}

function getPaymentTextColor(status: Appointment["paymentStatus"]) {
  switch (status) {
    case "paid":
      return "text-emerald-700";
    case "failed":
      return "text-rose-700";
    default:
      return "text-amber-700";
  }
}

function getDisplayStatusLabel(appointment: Appointment, hasPendingReschedule: boolean) {
  if (hasPendingReschedule) {
    return "Rescheduled";
  }

  return appointment.status;
}

function getDisplayStatusColor(appointment: Appointment, hasPendingReschedule: boolean) {
  if (hasPendingReschedule) {
    return "text-orange-600";
  }

  return getStatusTextColor(appointment.status);
}

export default function PatientAppointmentCard({
  appointment,
  onCancel,
  isCancelling,
  onCompletePayment,
  isCompletingPayment,
  onRescheduleResponse,
  isRespondingToReschedule,
}: PatientAppointmentCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);

  const hasPendingReschedule =
    appointment.rescheduleStatus === "pending" &&
    !!appointment.rescheduledDate &&
    !!appointment.rescheduledTime;


  const canCancel = appointment.status === "pending" && !hasPendingReschedule;

  const appointmentReason = (
    appointment as Appointment & { reason?: string }
  ).reason;
  const displayStatusLabel = getDisplayStatusLabel(appointment, hasPendingReschedule);
  const displayStatusColor = getDisplayStatusColor(appointment, hasPendingReschedule);

  const handleOpenDetails = () => {
    setShowCancelConfirm(false);
    setShowRefundConfirm(false);
    setIsVisible(false);
    setIsDetailsOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
  };

  const handleCloseDetails = () => {
    if (isCancelling) return;
    setIsVisible(false);
    setTimeout(() => {
      setIsDetailsOpen(false);
      setShowCancelConfirm(false);
      setShowRefundConfirm(false);
    }, 250);
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    onCancel(appointment._id);
  };

  const handleCancelConfirmationClose = () => {
    if (isCancelling) return;
    setShowCancelConfirm(false);
  };

  const handleRefundClick = () => {
    setShowRefundConfirm(true);
  };

  const handleConfirmRefund = () => {
    onRescheduleResponse(appointment._id, "rejected");
  };

  const handleRefundConfirmationClose = () => {
    if (isRespondingToReschedule) return;
    setShowRefundConfirm(false);
  };

  useEffect(() => {
    if (!isDetailsOpen) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousOverflow = document.body.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousOverflow;
      body.style.touchAction = previousBodyTouchAction;
    };
  }, [isDetailsOpen]);

  return (
    <>
      <div className="group h-full overflow-hidden rounded-[20px] border border-blue-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100">
      <div className="h-1 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-200" />
      <div className="relative flex h-full flex-col bg-white">

        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[16px] font-bold leading-tight tracking-[-0.02em] text-slate-900">
              {appointment.doctorName}
            </h3>

            <p className="mt-1 text-sm font-semibold text-blue-700">
              {appointment.specialization}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenDetails}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            title="User Information"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
              <path d="M12 11v5" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[12px] bg-blue-100/80 px-4 py-4">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="16" rx="3" />
                  <path d="M8 3v4" />
                  <path d="M16 3v4" />
                  <path d="M3 10h18" />
                  <path d="M12 13v5" />
                  <path d="M9.5 15.5h5" />
                </svg>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-600">
                Date
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-slate-900">
                {formatDate(appointment.appointmentDate)}
              </p>
            </div>

            <div className="rounded-[12px] bg-blue-100/80 px-4 py-4">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="13" r="7" />
                  <path d="M12 13V9.5" />
                  <path d="m12 13 2.5 1.5" />
                  <path d="M7 3.5 4.5 6" />
                  <path d="M17 3.5 19.5 6" />
                </svg>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-600">
                Time
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-slate-900">
                {formatTime(appointment.appointmentTime)}
              </p>
            </div>

            <div className="rounded-[12px] bg-blue-100/80 px-4 py-4">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="3" y="6" width="18" height="12" rx="3" />
                  <path d="M3 10h18" />
                  <path d="M7 15h3" />
                  <path d="M14 15h3" />
                </svg>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-600">
                Payment
              </p>
              <p
                className={`mt-0.5 text-[13px] font-semibold capitalize ${getPaymentTextColor(
                  appointment.paymentStatus
                )}`}
              >
                {appointment.paymentStatus}
              </p>
            </div>

            <div className="rounded-[12px] bg-blue-100/80 px-4 py-4">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M7 8a6 6 0 0 1 10-1" />
                  <path d="M17 5v4h-4" />
                  <path d="M17 16a6 6 0 0 1-10 1" />
                  <path d="M7 19v-4h4" />
                </svg>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-600">
                Status
              </p>
              <p
                className={`mt-0.5 text-[13px] font-semibold capitalize ${displayStatusColor}`}
              >
                {displayStatusLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto px-5 pb-5">
          <div className="flex flex-col gap-3">
            {appointment.status === "confirmed" && (
              <Link
                to={`/patient-waiting-room/${appointment._id}`}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Open Waiting Room
              </Link>
            )}
          </div>
        </div>
      </div>
      </div>

      {isDetailsOpen && (
        <div style={{transition:"background 250ms"}} className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${isVisible ? "bg-slate-900/60" : "bg-slate-900/0"}`}>
          <div style={{transition:"opacity 250ms, transform 250ms"}} className={`relative max-h-[84vh] w-full max-w-xl overflow-y-auto rounded-[24px] bg-white shadow-2xl ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
            <div className="sticky top-0 z-10 overflow-hidden border-b border-slate-200 bg-white/95 backdrop-blur">
              <div className="h-1 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-200" />
              <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 text-center">
                  <h3 className="text-xl font-bold text-slate-900">
                    Appointment Details
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Full information about this appointment
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseDetails}
                  disabled={isCancelling}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Close details popup"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      d="M18 6 6 18"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m6 6 12 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              </div>
            </div>

            <div className="space-y-3 px-4 py-3.5">
              <div className="rounded-3xl bg-gradient-to-r from-blue-50 via-cyan-50 to-emerald-50 p-3">
                <h4 className="text-base font-bold text-slate-900">
                  {appointment.doctorName || "-"}
                </h4>
                <p className="mt-1 text-sm font-medium text-cyan-700">
                  {appointment.specialization || "-"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Appointment Date
                  </p>
                  <p className="mt-2 text-base font-bold text-slate-900">
                    {formatDate(appointment.appointmentDate)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Appointment Time
                  </p>
                  <p className="mt-2 text-base font-bold text-slate-900">
                    {formatTime(appointment.appointmentTime)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </p>
                  <p
                    className={`mt-2 text-base font-bold capitalize ${displayStatusColor}`}
                  >
                    {displayStatusLabel}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Payment Status
                  </p>
                  <p
                    className={`mt-2 text-base font-bold capitalize ${getPaymentTextColor(
                      appointment.paymentStatus
                    )}`}
                  >
                    {appointment.paymentStatus}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Reason
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {appointmentReason?.trim() ? appointmentReason : "-"}
                  </p>
                </div>
              </div>

              {(appointment.rescheduledDate || appointment.rescheduledTime) && (
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Reschedule Details
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/80 p-3.5">
                      <p className="text-xs text-slate-500">Rescheduled Date</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {appointment.rescheduledDate
                          ? formatDate(appointment.rescheduledDate)
                          : "-"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3.5">
                      <p className="text-xs text-slate-500">Rescheduled Time</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {appointment.rescheduledTime
                          ? formatTime(appointment.rescheduledTime)
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {hasPendingReschedule && (
                    <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => onRescheduleResponse(appointment._id, "approved")}
                        disabled={isRespondingToReschedule}
                        className="flex-1 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isRespondingToReschedule ? "Processing..." : "Approve"}
                      </button>
                      {!showRefundConfirm ? (
                        <button
                          type="button"
                          onClick={handleRefundClick}
                          disabled={isRespondingToReschedule}
                          className="flex-1 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isRespondingToReschedule ? "Processing..." : "Ask Refund"}
                        </button>
                      ) : null}
                    </div>
                  )}

                  {hasPendingReschedule && showRefundConfirm ? (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-white/80 p-3">
                      <p className="text-sm font-semibold text-rose-700">
                        Are you sure you want to ask for a refund?
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        This will reject the rescheduled appointment and start the refund process.
                      </p>

                      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                        <button
                          type="button"
                          onClick={handleConfirmRefund}
                          disabled={isRespondingToReschedule}
                          className="flex-1 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isRespondingToReschedule ? "Processing..." : "Yes, Ask Refund"}
                        </button>
                        <button
                          type="button"
                          onClick={handleRefundConfirmationClose}
                          disabled={isRespondingToReschedule}
                          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          No, Keep Reschedule
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {canCancel && (
                <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-red-50 p-4">
                  {!showCancelConfirm ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-bold text-rose-700">
                          Need to cancel this appointment?
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          You can cancel it from here after confirmation.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleCancelClick}
                        className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-base font-bold text-rose-700">
                        Are you sure you want to cancel this appointment?
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        This action will cancel your appointment.
                      </p>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={handleConfirmCancel}
                          disabled={isCancelling}
                          className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isCancelling
                            ? "Cancelling..."
                            : "Yes, Cancel Appointment"}
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelConfirmationClose}
                          disabled={isCancelling}
                          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          No, Keep Appointment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row">
                {appointment.status === "confirmed" && (
                  <Link
                    to={`/patient-waiting-room/${appointment._id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Open Waiting Room
                  </Link>
                )}

                {appointment.paymentStatus === "pending" &&
                  appointment.status !== "cancelled" && (
                    <button
                      type="button"
                      onClick={() => onCompletePayment(appointment)}
                      disabled={isCompletingPayment}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCompletingPayment ? "Loading..." : "Complete Payment"}
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
