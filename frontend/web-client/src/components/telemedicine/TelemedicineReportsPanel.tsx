import { useEffect, useRef, useState } from "react";
import { PATIENT_API_URL } from "../../config/api";
import type { TelemedicineSession } from "../../services/telemedicineApi";

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

type TelemedicineReportsPanelProps = {
  session: TelemedicineSession;
  fallbackPatientName?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { message?: string; error?: string })
    | null;

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  if (data === null) {
    throw new Error("Empty response received from service");
  }

  return data as T;
}

function formatDateLabel(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

export default function TelemedicineReportsPanel({
  session,
  fallbackPatientName = "Patient",
}: TelemedicineReportsPanelProps) {
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [patientReport, setPatientReport] = useState<PatientReportData | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const reportsPanelRef = useRef<HTMLDivElement | null>(null);
  const reportsButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPatientReport() {
      if (!session.patientId) {
        if (isMounted) {
          setPatientReport(null);
          setReportsError("");
          setReportsLoading(false);
        }
        return;
      }

      try {
        setReportsLoading(true);
        setReportsError("");

        const response = await fetch(`${PATIENT_API_URL}/${session.patientId}`);
        const data = await parseResponse<PatientReportData>(response);

        if (isMounted) {
          setPatientReport(data);
        }
      } catch (error) {
        console.error("Failed to load patient reports:", error);
        if (isMounted) {
          setPatientReport(null);
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
  }, [session.patientId]);

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
  const reportPhone =
    patientReport?.countryCode && patientReport?.phone
      ? `${patientReport.countryCode} ${patientReport.phone}`
      : patientReport?.phone || "Not available";

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
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                {reportFullName}
              </h2>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {patientReport?.email || "Not available"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Phone
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {reportPhone}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Gender
                    </p>
                    <p className="mt-2 text-sm font-medium capitalize text-slate-800">
                      {patientReport?.gender || "Not available"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Birthday
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {formatDateLabel(patientReport?.birthday)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Country
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {patientReport?.country || "Not available"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Address
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {patientReport?.address || "Not available"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
