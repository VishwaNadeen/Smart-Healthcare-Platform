import React, { useRef, useState } from "react";
import {
  deletePatientReport,
  updatePatientReport,
  type ReportFormPayload,
} from "../../services/report";
import type { Report } from "../../types/report";
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

function formatReportType(reportType: string) {
  return (
    REPORT_TYPE_OPTIONS.find((option) => option.value === reportType)?.label ||
    reportType
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function formatDate(dateString?: string) {
  if (!dateString) {
    return "Unknown date";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function toDateInputValue(dateString?: string) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
}

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ReportListProps {
  patientId: string;
  reports: Report[];
  onRefresh: () => Promise<void> | void;
}

const ReportList: React.FC<ReportListProps> = ({
  patientId,
  reports,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const replacementFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingReportId, setEditingReportId] = useState("");
  const [editingForm, setEditingForm] = useState<ReportFormPayload>({
    reportType: "general",
    reportTitle: "",
    providerName: "",
    reportDate: "",
    notes: "",
  });
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [busyReportId, setBusyReportId] = useState("");
  const [isDraggingReplacement, setIsDraggingReplacement] = useState(false);

  function clearReplacementFile() {
    setReplacementFile(null);

    if (replacementFileInputRef.current) {
      replacementFileInputRef.current.value = "";
    }
  }

  function handleChooseReplacementFile() {
    replacementFileInputRef.current?.click();
  }

  async function handleDelete(reportId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this report?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setBusyReportId(reportId);
      const response = await deletePatientReport(patientId, reportId);
      showToast(response.message || "Report deleted successfully.", "success");
      await onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete report.";
      showToast(message, "error");
    } finally {
      setBusyReportId("");
    }
  }

  async function handleSave(reportId: string) {
    if (!editingForm.reportTitle.trim()) {
      showToast("Report title is required.", "error");
      return;
    }

    if (!editingForm.reportDate) {
      showToast("Report date is required.", "error");
      return;
    }

    try {
      setBusyReportId(reportId);
      const response = await updatePatientReport(
        patientId,
        reportId,
        {
          reportType: editingForm.reportType,
          reportTitle: editingForm.reportTitle.trim(),
          providerName: editingForm.providerName.trim(),
          reportDate: editingForm.reportDate,
          notes: editingForm.notes.trim(),
        },
        replacementFile
      );
      showToast(response.message || "Report updated successfully.", "success");
      setEditingReportId("");
      clearReplacementFile();
      await onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update report.";
      showToast(message, "error");
    } finally {
      setBusyReportId("");
    }
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/60 px-6 py-10 text-center">
        <h3 className="text-lg font-semibold text-slate-900">No reports yet</h3>
        <p className="mt-2 text-sm text-slate-500">
          Uploaded reports will appear here with options to view, edit, and delete.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {reports.map((report) => {
        const isEditing = editingReportId === report._id;
        const isBusy = busyReportId === report._id;

        return (
          <article
            key={report._id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {formatReportType(report.reportType)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Report date {formatDate(report.reportDate)}
                  </span>
                </div>

                {isEditing ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Report Title
                      </label>
                      <input
                        type="text"
                        value={editingForm.reportTitle}
                        onChange={(event) =>
                          setEditingForm((current) => ({
                            ...current,
                            reportTitle: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Report Category
                      </label>
                      <select
                        value={editingForm.reportType}
                        onChange={(event) =>
                          setEditingForm((current) => ({
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
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Hospital / Lab / Clinic
                      </label>
                      <input
                        type="text"
                        value={editingForm.providerName}
                        onChange={(event) =>
                          setEditingForm((current) => ({
                            ...current,
                            providerName: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Report Date
                      </label>
                      <input
                        type="date"
                        value={editingForm.reportDate}
                        onChange={(event) =>
                          setEditingForm((current) => ({
                            ...current,
                            reportDate: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Notes
                      </label>
                      <textarea
                        rows={3}
                        value={editingForm.notes}
                        onChange={(event) =>
                          setEditingForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Current Uploaded File
                      </label>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {report.fileName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              This file is already attached to the report.
                            </p>
                          </div>

                          <a
                            href={report.filePath}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                          >
                            View Current File
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Replace Uploaded File
                      </label>

                      <input
                        ref={replacementFileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(event) =>
                          setReplacementFile(event.target.files?.[0] || null)
                        }
                        className="hidden"
                      />

                      <div className="mb-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleChooseReplacementFile}
                          disabled={isBusy}
                          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Choose File
                        </button>

                        <button
                          type="button"
                          onClick={clearReplacementFile}
                          disabled={!replacementFile || isBusy}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Clear File
                        </button>
                      </div>

                      <div
                        onDragOver={(event) => {
                          event.preventDefault();
                          setIsDraggingReplacement(true);
                        }}
                        onDragLeave={() => setIsDraggingReplacement(false)}
                        onDrop={(event) => {
                          event.preventDefault();
                          setIsDraggingReplacement(false);
                          setReplacementFile(event.dataTransfer.files?.[0] || null);
                        }}
                        onClick={handleChooseReplacementFile}
                        className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                          isDraggingReplacement
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
                          {replacementFile
                            ? `${replacementFile.name} selected`
                            : "Drag and drop the replacement file here, or click to browse."}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Accepted formats: PDF, JPG, JPEG, PNG
                        </p>
                      </div>

                      {replacementFile ? (
                        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
                          <p className="text-sm font-semibold text-blue-800">
                            Replacement file
                          </p>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {replacementFile.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {replacementFile.type || "Unknown format"} |{" "}
                                {formatFileSize(replacementFile.size)}
                              </p>
                            </div>

                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                              New file selected
                            </span>
                          </div>
                        </div>
                      ) : null}

                      <p className="mt-2 text-xs text-slate-500">
                        Optional. Leave this empty if you want to keep the current uploaded file.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {report.reportTitle}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        File: {report.fileName}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Category
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {formatReportType(report.reportType)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Hospital / Lab / Clinic
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {report.providerName || "Not specified"}
                        </p>
                      </div>
                    </div>

                    {report.notes ? (
                      <div className="rounded-2xl bg-blue-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Notes
                        </p>
                        <p className="mt-1 text-sm text-slate-700">{report.notes}</p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <a
                  href={report.filePath}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  View Report
                </a>

                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleSave(report._id)}
                      disabled={isBusy}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-70"
                    >
                      {isBusy ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingReportId("");
                        clearReplacementFile();
                      }}
                      disabled={isBusy}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-70"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingReportId(report._id);
                        clearReplacementFile();
                        setEditingForm({
                          reportType: report.reportType,
                          reportTitle: report.reportTitle || "",
                          providerName: report.providerName || "",
                          reportDate: toDateInputValue(report.reportDate),
                          notes: report.notes || "",
                        });
                      }}
                      disabled={isBusy}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-70"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(report._id)}
                      disabled={isBusy}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-70"
                    >
                      {isBusy ? "Deleting..." : "Delete"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default ReportList;
