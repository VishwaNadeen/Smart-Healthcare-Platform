import { useState } from "react";

export default function FileUploadPanel() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  }

  function handleUpload() {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }

    alert(`File selected: ${selectedFile.name}`);
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg p-4 md:p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">File Upload</h2>

      <input
        type="file"
        onChange={handleFileChange}
        className="block w-full rounded-lg border border-slate-300 p-2 text-sm"
      />

      {selectedFile && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 border border-slate-200">
          <p className="text-sm text-slate-700">
            Selected File: <span className="font-semibold">{selectedFile.name}</span>
          </p>
        </div>
      )}

      <button
        onClick={handleUpload}
        className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-700"
      >
        Upload File
      </button>
    </div>
  );
}