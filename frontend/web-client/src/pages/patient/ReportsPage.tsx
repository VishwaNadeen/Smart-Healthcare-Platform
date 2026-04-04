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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-white">
            <h1 className="text-3xl font-bold">Medical Report</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
              Upload and review your lab reports, scan results, and supporting
              medical documents in one place.
            </p>
          </div>

          <div className="grid gap-6 p-6">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Upload New Report
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-500">
                    Add a new PDF or image report. Once uploaded, you will be
                    taken to your report library where you can view, edit, or
                    delete uploaded reports.
                  </p>
                </div>

                <Link
                  to="/medical-history/reports"
                  className="inline-flex rounded-2xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
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
