type CallControlsProps = {
  onEndCall?: () => void;
};

export default function CallControls({ onEndCall }: CallControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <button
        type="button"
        className="rounded-full bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
      >
        Mute Mic
      </button>

      <button
        type="button"
        className="rounded-full bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
      >
        Turn Off Camera
      </button>

      <button
        type="button"
        onClick={onEndCall}
        className="rounded-full bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700"
      >
        End Call
      </button>
    </div>
  );
}