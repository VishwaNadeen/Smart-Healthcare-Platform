import { useEffect, useState } from "react";
import { getUserStats } from "../../services/authApi";
import { getTelemedicineStats } from "../../services/telemedicineApi";

type StatisticsState = {
  doctorCount: number;
  patientCount: number;
  todaySessions: number;
  cancelledSessions: number;
};

export default function Statistics() {
  const [stats, setStats] = useState<StatisticsState>({
    doctorCount: 0,
    patientCount: 0,
    todaySessions: 0,
    cancelledSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatistics() {
      try {
        setLoading(true);
        const [userStats, telemedicineStats] = await Promise.all([
          getUserStats(),
          getTelemedicineStats(),
        ]);

        setStats({
          doctorCount: userStats.doctorCount,
          patientCount: userStats.patientCount,
          todaySessions: telemedicineStats.todaySessions,
          cancelledSessions: telemedicineStats.cancelledSessions,
        });
        setError(null);
      } catch (loadError) {
        console.error("Failed to load telemedicine statistics:", loadError);
        setError("Failed to load telemedicine statistics.");
      } finally {
        setLoading(false);
      }
    }

    loadStatistics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">
          Telemedicine Statistics
        </h1>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-600">
              Total Doctors
            </h2>
            <p className="mt-3 text-3xl font-bold text-blue-600">
              {loading ? "..." : stats.doctorCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-600">
              Total Patients
            </h2>
            <p className="mt-3 text-3xl font-bold text-emerald-600">
              {loading ? "..." : stats.patientCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-600">
              Today Sessions
            </h2>
            <p className="mt-3 text-3xl font-bold text-orange-600">
              {loading ? "..." : stats.todaySessions}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-600">
              Cancelled Sessions
            </h2>
            <p className="mt-3 text-3xl font-bold text-red-600">
              {loading ? "..." : stats.cancelledSessions}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
