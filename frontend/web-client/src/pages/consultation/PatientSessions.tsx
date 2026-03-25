import { useEffect, useState } from "react";
import SessionCard from "../../components/ui/SessionCard";
import { getSessionsByPatientId } from "../../services/telemedicineApi";
import type { TelemedicineSession } from "../../services/telemedicineApi";

export default function PatientSessions() {
  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const patientId = "PAT001";

  useEffect(() => {
    async function loadSessions() {
      try {
        setLoading(true);
        setError("");
        const data = await getSessionsByPatientId(patientId);
        setSessions(data);
      } catch (error) {
        console.error("Failed to load patient sessions:", error);
        setError("Unable to load patient sessions right now.");
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [patientId]);

  return (
    <section
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "40px 20px 64px",
      }}
    >
      <div
        style={{
          marginBottom: "24px",
          padding: "24px",
          borderRadius: "20px",
          background:
            "linear-gradient(135deg, rgb(10, 132, 255), rgb(60, 179, 113))",
          color: "#fff",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: "14px", opacity: 0.9 }}>
          Telemedicine
        </p>
        <h2 style={{ margin: 0, fontSize: "32px" }}>Patient Sessions</h2>
        <p style={{ margin: "10px 0 0", fontSize: "16px", opacity: 0.95 }}>
          View your scheduled online consultations in one place.
        </p>
      </div>

      {loading ? (
        <div
          style={{
            padding: "24px",
            border: "1px solid #dbe4f0",
            borderRadius: "16px",
            backgroundColor: "#f8fbff",
          }}
        >
          Loading patient sessions...
        </div>
      ) : error ? (
        <div
          style={{
            padding: "24px",
            border: "1px solid #f1b5b5",
            borderRadius: "16px",
            backgroundColor: "#fff5f5",
            color: "#9f1d1d",
          }}
        >
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <div
          style={{
            padding: "24px",
            border: "1px dashed #c6d4e1",
            borderRadius: "16px",
            backgroundColor: "#f8fbff",
          }}
        >
          No sessions found for this patient.
        </div>
      ) : (
        <div>
          {sessions.map((session) => (
            <SessionCard key={session._id} session={session} />
          ))}
        </div>
      )}
    </section>
  );
}
