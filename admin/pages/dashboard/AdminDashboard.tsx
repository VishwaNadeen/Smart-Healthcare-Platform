import { useEffect, useState } from "react";
import StatCard from "../../components/ui/StatCard";
import { getAdminDashboardStats } from "../../services/adminApi";
import type { AdminDashboardStats } from "../../types/admin";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getAdminDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Dashboard load failed:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-red-500">Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-800">Admin Dashboard</h2>
        <p className="mt-2 text-slate-600">
          Overview of telemedicine system activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Sessions" value={stats.totalSessions} />
        <StatCard title="Scheduled Sessions" value={stats.scheduledSessions} />
        <StatCard title="Active Sessions" value={stats.activeSessions} />
        <StatCard title="Completed Sessions" value={stats.completedSessions} />
        <StatCard title="Cancelled Sessions" value={stats.cancelledSessions} />
        <StatCard title="Total Prescriptions" value={stats.totalPrescriptions} />
        <StatCard title="Total Files" value={stats.totalFiles} />
        <StatCard title="Total Doctors" value={stats.totalDoctors} />
        <StatCard title="Total Patients" value={stats.totalPatients} />
      </div>
    </div>
  );
}