import { useEffect, useRef, useState } from "react";
import {
  getPatientDetailsByAuthUserId,
  getPatientSummaryByAuthUserId,
} from "../../services/patientApi";
import { getPatientReports } from "../../services/report";
import type { TelemedicineSession } from "../../services/telemedicineApi";
import type { Report } from "../../types/report";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

type PatientReportData = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  countryCode?: string;
  phone?: string;
  birthday?: string;
  gender?: string;
  address?: string;
  country?: string;
};

function formatReportDate(value?: string) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function formatReportType(value?: string) {
  if (!value) {
    return "General Report";
  }

  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type TelemedicineReportsPanelProps = {
  session: TelemedicineSession;
  fallbackPatientName?: string;
};

export default function TelemedicineReportsPanel({
  session,
  fallbackPatientName = "Patient",
}: TelemedicineReportsPanelProps) {
  const auth = getStoredTelemedicineAuth();
  const isPatientView = auth.actorRole === "patient";
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [patientReport, setPatientReport] = useState<PatientReportData | null>(null);
  const [patientReports, setPatientReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const reportsPanelRef = useRef<HTMLDivElement | null>(null);
  const reportsButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPatientReport() {
      if (!session.patientId || !auth.token) {
        if (isMounted) {
          setPatientReport(null);
          setPatientReports([]);
          setReportsError("");
          setReportsLoading(false);
        }
        return;
      }

      try {
        setReportsLoading(true);
        setReportsError("");
        const patientSummary = await getPatientSummaryByAuthUserId(
          auth.token,
          session.patientId
        );
        const [patientDetails, reports] = await Promise.all([
          getPatientDetailsByAuthUserId(auth.token, session.patientId),
          getPatientReports(patientSummary._id),
        ]);

        if (isMounted) {
          setPatientReport(patientDetails);
          setPatientReports(reports);
        }
      } catch (error) {
        console.error("Failed to load patient reports:", error);
        if (isMounted) {
          setPatientReport(null);
          setPatientReports([]);
          setReportsError(
            error instanceof Error ? error.message : "Failed to load patient reports"
          );
        }
      } finally {
        if (isMounted) {
          setReportsLoading(false);
        }
      }
    }

    void loadPatientReport();

    return () => {
      isMounted = false;
    };
  }, [auth.token, session.patientId]);

  useEffect(() => {
    if (!isReportsOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (reportsPanelRef.current?.contains(target)) {
        return;
      }

      if (reportsButtonRef.current?.contains(target)) {
        return;
      }

      setIsReportsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isReportsOpen]);

  const reportFullName =
    `${patientReport?.firstName || ""} ${patientReport?.lastName || ""}`.trim() ||
    fallbackPatientName;
  const patientAge =
    patientReport?.birthday
      ? (() => {
          const birthDate = new Date(patientReport.birthday);
          if (Number.isNaN(birthDate.getTime())) {
            return null;
          }

          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDifference = today.getMonth() - birthDate.getMonth();

          if (
            monthDifference < 0 ||
            (monthDifference === 0 && today.getDate() < birthDate.getDate())
          ) {
            age -= 1;
          }

          return age >= 0 ? age : null;
        })()
      : null;

  return (
    <>
      <button
        ref={reportsButtonRef}
        type="button"
        onClick={() => setIsReportsOpen((current) => !current)}
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-2xl bg-yellow-300 px-6 py-3 text-lg font-semibold text-amber-950 shadow-[0_12px_28px_rgba(245,158,11,0.24)] transition hover:bg-yellow-400"
        style={{
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          fontFamily: 'Calibri, "Segoe UI", sans-serif',
        }}
        aria-label={isReportsOpen ? "Close reports" : "Open reports"}
        title={isReportsOpen ? "Close reports" : "Open reports"}
      >
        Reports
      </button>

      <div
        ref={reportsPanelRef}
        className={`fixed inset-y-6 right-6 z-40 w-[22rem] max-w-[calc(100vw-5rem)] rounded-3xl border border-amber-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.14)] transition-all duration-300 ease-out ${
          isReportsOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-[110%] opacity-0"
        }`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                Patient Reports
              </p>
              {!isPatientView ? (
                <>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {reportFullName}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {patientAge !== null ? `${patientAge} years old` : "Age not available"}
                  </p>
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsReportsOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="Close reports"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {reportsLoading ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-600">
                Loading patient reports...
              </div>
            ) : reportsError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
                {reportsError}
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Uploaded Reports
                    </p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      {patientReports.length}
                    </span>
                  </div>

                  {patientReports.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-600">
                      No uploaded reports found for this patient.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {patientReports.map((report) => (
                        <div
                          key={report._id}
                          className="rounded-2xl border border-amber-100 bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {report.reportTitle || report.fileName}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatReportType(report.reportType)} • {formatReportDate(report.reportDate)}
                              </p>
                              {report.providerName ? (
                                <p className="mt-1 text-xs text-slate-500">
                                  {report.providerName}
                                </p>
                              ) : null}
                            </div>

                            <a
                              href={report.filePath}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                            >
                              View
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
