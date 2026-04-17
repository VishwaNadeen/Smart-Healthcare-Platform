import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReportList from "../../components/report/ReportList";
import PageLoading from "../../components/common/PageLoading";
import { getCurrentPatientProfile } from "../../services/patientApi";
import { getPatientReports } from "../../services/report";
import type { Report } from "../../types/report";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

export default function ReportsManagerPage() {
  const auth = getStoredTelemedicineAuth();
  const [patientId, setPatientId] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReports(currentPatientId: string) {
    const data = await getPatientReports(currentPatientId);
    setReports(data);
  }

  useEffect(() => {
    let isActive = true;

    async function loadPage() {
      if (!auth.token) {
        if (isActive) {
          setError("Please login to manage your reports.");
          setLoading(false);
        }
        return;
      }

      try {
        const patient = await getCurrentPatientProfile(auth.token);

        if (!isActive) {
          return;
        }

        setPatientId(patient._id);
        const data = await getPatientReports(patient._id);

        if (!isActive) {
          return;
        }

        setReports(data);
        setError("");
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to load uploaded reports.";

        setError(message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      isActive = false;
    };
  }, [auth.token]);

  if (loading) {
    return <PageLoading message="Loading reports..." />;
  }

  if (error || !patientId) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Uploaded Reports</h1>
          <p className="mt-3 text-sm text-red-600">
            {error || "Unable to load your report list right now."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Uploaded Reports</h1>
              <p className="mt-2 text-sm text-slate-500">
                Review, edit, and delete the medical reports you have uploaded.
              </p>
            </div>

            <Link
              to="/medical-history?mode=upload"
              className="inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Upload New Report
            </Link>
          </div>

          <div className="p-6">
            <ReportList
              patientId={patientId}
              reports={reports}
              onRefresh={() => loadReports(patientId)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
