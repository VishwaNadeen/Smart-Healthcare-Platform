import { useEffect, useState } from "react";
import SessionCard from "../../components/ui/SessionCard";
import { getSessionsByDoctorId } from "../../services/telemedicineApi";
import type { TelemedicineSession } from "../../services/telemedicineApi";

export default function DoctorSessions() {
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);

  const doctorId = "DOC001";

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await getSessionsByDoctorId(doctorId);
        setSessions(data);
      } catch (error) {
        console.error("Failed to load doctor sessions:", error);
      }
    }

    loadSessions();
  }, [doctorId]);

  return (
    <div>
      <h2>Doctor Sessions</h2>
      {sessions.length === 0 ? (
        <p>No sessions found.</p>
      ) : (
        sessions.map((session) => (
          <SessionCard key={session._id} session={session} />
        ))
      )}
    </div>
  );
}