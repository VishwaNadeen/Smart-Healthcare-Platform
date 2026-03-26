import { useEffect, useState } from "react";
import {
  getFilesByAppointmentId,
  uploadTelemedicineFile,
} from "../../services/telemedicineApi";
import { TELEMEDICINE_UPLOADS_BASE_URL } from "../../config/api";
import type { TelemedicineFile } from "../../services/telemedicineApi";

type FileUploadPanelProps = {
  appointmentId: string;
  role: "doctor" | "patient";
};

export default function FileUploadPanel({
  appointmentId,
  role,
}: FileUploadPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [files, setFiles] = useState<TelemedicineFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadFiles() {
      try {
        const response = await getFilesByAppointmentId(appointmentId);
        setFiles(response.data || []);
      } catch (error) {
        console.error("Failed to load files:", error);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    }

    if (appointmentId) {
      loadFiles();
    } else {
      setLoading(false);
    }
  }, [appointmentId]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }

    try {
      setUploading(true);

      const response = await uploadTelemedicineFile({
        appointmentId,
        uploadedByRole: role,
        file: selectedFile,
      });

      setFiles((prev) => [response.data, ...prev]);
      setSelectedFile(null);
      alert("File uploaded successfully");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg md:p-6">
      <h2 className="mb-4 text-xl font-bold text-slate-800">File Upload</h2>

      <input
        type="file"
        onChange={handleFileChange}
        className="block w-full rounded-lg border border-slate-300 p-2 text-sm"
      />

      {selectedFile && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm text-slate-700">
            Selected File:{" "}
            <span className="font-semibold">{selectedFile.name}</span>
          </p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || !selectedFile}
        className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? "Uploading..." : "Upload File"}
      </button>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading files...</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-slate-500">No files uploaded yet.</p>
        ) : (
          files.map((file) => (
            <a
              key={file._id}
              href={`${TELEMEDICINE_UPLOADS_BASE_URL}${file.filePath}`}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-blue-600 hover:underline"
            >
              {file.originalName}
            </a>
          ))
        )}
      </div>
    </div>
  );
}
