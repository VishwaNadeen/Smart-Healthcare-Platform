import { useEffect, useState } from "react";
import {
  getAllSessions,
  type TelemedicineSession,
} from "../../services/telemedicineApi";

type DashboardStats = {
  total: number;
  active: number;
  completed: number;
};

function buildDashboardStats(sessions: TelemedicineSession[]): DashboardStats {
  return {
    total: sessions.length,
    active: sessions.filter((session) => session.status === "active").length,
    completed: sessions.filter((session) => session.status === "completed")
      .length,
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    active: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const sessions = await getAllSessions();
        setStats(buildDashboardStats(sessions));
        setError(null);
      } catch (loadError) {
        console.error("Failed to load dashboard stats:", loadError);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-bold text-slate-800">
          Telemedicine Dashboard
        </h1>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-700">
              Total Sessions
            </h2>
            <p className="mt-3 text-3xl font-bold text-blue-600">
              {loading ? "..." : stats.total}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-700">
              Active Sessions
            </h2>
            <p className="mt-3 text-3xl font-bold text-emerald-600">
              {loading ? "..." : stats.active}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-700">
              Completed Sessions
            </h2>
            <p className="mt-3 text-3xl font-bold text-purple-600">
              {loading ? "..." : stats.completed}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
