import { useEffect, useState } from "react";
import ReportsPage from "./ReportsPage";
import { getCurrentPatientProfile } from "../../services/patientApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

export default function MedicalHistoryPage() {
  const auth = getStoredTelemedicineAuth();
  const [patientId, setPatientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-600">
            Loading medical history...
          </p>
        </div>
      </div>
    );
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

  return <ReportsPage patientId={patientId} />;
}
