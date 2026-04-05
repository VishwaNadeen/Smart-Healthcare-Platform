type HangupConfirmModalProps = {
  open: boolean;
  busy?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function HangupConfirmModal({
  open,
  busy = false,
  title = "End Consultation?",
  description = "This will hang up the meeting, save the medical notes and prescriptions, and complete the session.",
  confirmLabel = "End Consultation",
  onCancel,
  onConfirm,
}: HangupConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {description}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Ending..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
