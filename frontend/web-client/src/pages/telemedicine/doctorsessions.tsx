import { useEffect, useMemo, useState } from "react";
import FullScreenPageLoading from "../../components/common/FullScreenPageLoading";
import DoctorSessionCard from "../../components/telemedicine/DoctorSessionCard";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import NoApprovedSessions from "./noApprovedSessions";
import {
  getSessionsByDoctorId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

function formatSessionDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-LK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DoctorSessions() {
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const auth = getStoredTelemedicineAuth();

  const doctorId = auth.doctorProfileId || auth.userId;

  useEffect(() => {
    async function loadSessions() {
      if (!doctorId) {
        setError("Doctor ID not found in stored login data.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getSessionsByDoctorId(doctorId);
        setSessions(Array.isArray(data) ? data : []);
      } catch (error: unknown) {
        console.error("Failed to load doctor sessions:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load doctor sessions."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [doctorId]);

  const approvedSessions = useMemo(() => {
    return sessions
      .filter(
        (session) =>
          session.status === "scheduled" || session.status === "active"
      )
      .sort((a, b) => {
        const aDate = new Date(
          `${a.scheduledDate}T${a.scheduledTime}`
        ).getTime();
        const bDate = new Date(
          `${b.scheduledDate}T${b.scheduledTime}`
        ).getTime();
        return aDate - bDate;
      });
  }, [sessions]);

  const groupedSessions = useMemo(() => {
    const groups = new Map<string, TelemedicineSession[]>();

    approvedSessions.forEach((session) => {
      const key = session.scheduledDate || "Undated Sessions";
      const currentGroup = groups.get(key) || [];
      currentGroup.push(session);
      groups.set(key, currentGroup);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      label: date === "Undated Sessions" ? date : formatSessionDate(date),
      items,
    }));
  }, [approvedSessions]);

  if (!doctorId) {
    return (
      <TelemedicineAccessNotice
        title="Doctor session access needs a user id"
        description="Your login session is missing the doctor id returned by the backend. Please sign in again."
        actionLabel="Go to Login"
      />
    );
  }

  if (loading) {
    return <FullScreenPageLoading message="Loading approved sessions..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl bg-red-50 p-8 text-center text-red-600 shadow-sm">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (approvedSessions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <NoApprovedSessions appointmentLink="/appointments/doctor" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 overflow-hidden rounded-3xl border border-blue-100 bg-white text-center shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-200" />
          <div className="p-6">
            <h1 className="text-3xl font-bold text-slate-900">
            Consultation Sessions
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Only approved consultation sessions are shown here.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {groupedSessions.map((group) => (
            <section key={group.date} className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  {group.label}
                </div>
                <div className="h-px flex-1 bg-blue-100" />
                <div className="shrink-0 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  {group.items.length} session{group.items.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((session) => (
                  <DoctorSessionCard key={session._id} session={session} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
