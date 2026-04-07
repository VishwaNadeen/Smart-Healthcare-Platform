import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReportUploadForm from "../../components/report/ReportUploadForm";

interface PatientReportsPageProps {
  patientId: string;
}

const PatientReportsPage: React.FC<PatientReportsPageProps> = ({
  patientId,
}) => {
  const [isReady, setIsReady] = useState(Boolean(patientId));

  const loadReports = async () => {
    return;
  };

  useEffect(() => {
    setIsReady(Boolean(patientId));
  }, [patientId]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-6 p-6">
            <section className="rounded-3xl border border-blue-200 bg-blue-100/70 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <span className="inline-flex rounded-full bg-blue-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Medical Reports
                  </span>
                  <h1 className="mt-4 text-3xl font-bold text-slate-900">
                    Upload a new report
                  </h1>
                  <p className="mt-3 text-sm text-slate-600 sm:text-base">
                    Add lab reports, scans, and other medical documents to keep
                    your health history organized and easy to review later.
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-100/80 px-4 py-4 shadow-sm lg:max-w-xs">
                  <p className="text-sm font-semibold text-slate-900">
                    Before you upload
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Use a clear title, choose the correct category, and upload a
                    PDF or image file for easier tracking.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex justify-start sm:justify-end">
                <Link
                  to="/medical-history/reports"
                  className="inline-flex w-fit rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Go to Report List
                </Link>
              </div>

              <div className="mt-6">
                {isReady ? (
                  <ReportUploadForm
                    patientId={patientId}
                    onUploadSuccess={loadReports}
                  />
                ) : (
                  <p className="text-sm text-slate-500">
                    Preparing upload form...
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientReportsPage;
