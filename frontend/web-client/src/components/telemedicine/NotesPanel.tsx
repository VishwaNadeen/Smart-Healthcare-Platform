type NotesPanelProps = {
  notes: string;
  onChange: (value: string) => void;
};

export default function NotesPanel({
  notes,
  onChange,
}: NotesPanelProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        Session Notes
      </h2>

      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add consultation notes here..."
        className="min-h-[180px] w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500"
      />

      <div className="mt-3 text-xs text-gray-500">
        Notes UI is ready. Save API can be added later.
      </div>
    </div>
  );
}