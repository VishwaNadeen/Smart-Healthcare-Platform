import type { AdminDashboardStats } from "../types/admin";

const ADMIN_API_BASE = "http://localhost:5007/api/admin";

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    const response = await fetch(`${ADMIN_API_BASE}/dashboard-stats`);

    if (!response.ok) {
      throw new Error("Failed to fetch dashboard stats");
    }

    return response.json();
  } catch (error) {
    console.warn("Fallback stats used:", error);

    return {
      totalSessions: 25,
      scheduledSessions: 8,
      activeSessions: 3,
      completedSessions: 10,
      cancelledSessions: 4,
      totalPrescriptions: 12,
      totalFiles: 9,
      totalDoctors: 6,
      totalPatients: 18,
    };
  }
}