import React, { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  uploadPatientReport,
  type ReportFormPayload,
} from "../../services/report";
import { useToast } from "../common/ToastProvider";

const REPORT_TYPE_OPTIONS = [
  { value: "general", label: "General Report" },
  { value: "blood-test", label: "Blood Test" },
  { value: "x-ray", label: "X-Ray" },
  { value: "mri", label: "MRI" },
  { value: "ct-scan", label: "CT Scan" },
  { value: "ultrasound", label: "Ultrasound" },
  { value: "ecg", label: "ECG" },
  { value: "prescription", label: "Prescription" },
];

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

interface ReportUploadFormProps {
  patientId: string;
  onUploadSuccess: () => Promise<void> | void;
}

const ReportUploadForm: React.FC<ReportUploadFormProps> = ({
  patientId,
  onUploadSuccess,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<ReportFormPayload>({
    reportType: "general",
    reportTitle: "",
    providerName: "",
    reportDate: getTodayDate(),
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const clearSelectedFile = () => {
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setFormData({
      reportType: "general",
      reportTitle: "",
      providerName: "",
      reportDate: getTodayDate(),
      notes: "",
    });
    clearSelectedFile();
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];

    if (!droppedFile) {
      return;
    }

    setFile(droppedFile);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.reportTitle.trim()) {
      showToast("Please enter a report title.", "error");
      return;
    }

    if (!formData.reportDate) {
      showToast("Please select the report date.", "error");
      return;
    }

    if (!file) {
      showToast("Please select a report file first.", "error");
      return;
    }

    try {
      setLoading(true);
      await uploadPatientReport(patientId, file, {
        reportType: formData.reportType.trim() || "general",
        reportTitle: formData.reportTitle.trim(),
        providerName: formData.providerName.trim(),
        reportDate: formData.reportDate,
        notes: formData.notes.trim(),
      });
      showToast("Report uploaded successfully.", "success");
      resetForm();
      await onUploadSuccess();
      navigate("/medical-history/reports");
    } catch (error) {
      console.error("Upload failed:", error);
      const message =
        error instanceof Error ? error.message : "Report upload failed.";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="reportTitle"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Report Title
          </label>
          <input
            id="reportTitle"
            type="text"
            value={formData.reportTitle}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                reportTitle: event.target.value,
              }))
            }
            placeholder="Ex: Full Blood Count Report"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="reportType"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Report Category
          </label>
          <select
            id="reportType"
            value={formData.reportType}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                reportType: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {REPORT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="providerName"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Hospital / Lab / Clinic
          </label>
          <input
            id="providerName"
            type="text"
            value={formData.providerName}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                providerName: event.target.value,
              }))
            }
            placeholder="Ex: Asiri Central Laboratory"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="reportDate"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Report Date
          </label>
          <input
            id="reportDate"
            type="date"
            value={formData.reportDate}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                reportDate: event.target.value,
              }))
            }
            max={getTodayDate()}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
          rows={3}
          placeholder="Optional note about the uploaded report"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <label
            htmlFor="reportFile"
            className="block text-sm font-semibold text-slate-700"
          >
            Upload Report File
          </label>
          <p className="text-xs text-slate-500">
            Maximum file size: 10 MB, maximum number of files: 1
          </p>
        </div>

        <input
          ref={fileInputRef}
          id="reportFile"
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
        />

        <div className="mb-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleChooseFile}
            disabled={loading}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Choose File
          </button>

          <button
            type="button"
            onClick={clearSelectedFile}
            disabled={!file || loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear File
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={handleChooseFile}
          className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            isDragging
              ? "border-blue-500 bg-blue-100"
              : "border-blue-400 bg-blue-50/60 hover:bg-blue-50"
          }`}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          </div>

          <p className="mt-4 text-sm font-medium text-blue-700">
            {file
              ? `${file.name} selected`
              : "Drag and drop the report file here, or click to browse."}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Accepted formats: PDF, JPG, JPEG, PNG
          </p>
        </div>

        {file ? (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
            <p className="text-sm font-semibold text-blue-800">
              Selected file
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{file.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {file.type || "Unknown format"} | {formatFileSize(file.size)}
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                {
                  REPORT_TYPE_OPTIONS.find(
                    (option) => option.value === formData.reportType
                  )?.label
                }
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>

        <button
          type="button"
          onClick={resetForm}
          disabled={loading}
          className="rounded-xl bg-slate-600 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ReportUploadForm;
