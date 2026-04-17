import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import ReportsPage from "./ReportsPage";
import PageLoading from "../../components/common/PageLoading";
import { getCurrentPatientProfile } from "../../services/patientApi";
import { getPatientReports } from "../../services/report";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

export default function MedicalHistoryPage() {
  const auth = getStoredTelemedicineAuth();
  const [searchParams] = useSearchParams();
  const [patientId, setPatientId] = useState("");
  const [hasReports, setHasReports] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const forceUploadForm = searchParams.get("mode") === "upload";

  useEffect(() => {
    let isActive = true;

    async function loadCurrentPatient() {
      if (!auth.token) {
        if (isActive) {
          setError("Please login to view your medical history.");
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
        const reports = await getPatientReports(patient._id);

        if (!isActive) {
          return;
        }

        setHasReports(reports.length > 0);
        setError("");
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to load medical history.";

        setError(message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadCurrentPatient();

    return () => {
      isActive = false;
    };
  }, [auth.token]);

  if (loading) {
    return <PageLoading message="Loading medical history..." />;
  }

  if (error || !patientId) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Medical History</h1>
          <p className="mt-3 text-sm text-red-600">
            {error || "Unable to load your medical history right now."}
          </p>
        </div>
      </div>
    );
  }

  if (hasReports && !forceUploadForm) {
    return <Navigate to="/medical-history/reports" replace />;
  }

  return <ReportsPage patientId={patientId} />;
}
