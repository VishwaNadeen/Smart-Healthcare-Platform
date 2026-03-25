import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { getSessionByAppointmentId } from "../../services/telemedicineApi";
import type { TelemedicineSession } from "../../services/telemedicineApi";

export default function Consultation() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      if (!appointmentId) return;

      try {
        const data = await getSessionByAppointmentId(appointmentId);
        setSession(data);
      } catch (error) {
        console.error("Failed to load session:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [appointmentId]);

  if (loading) {
    return <p>Loading consultation...</p>;
  }

  if (!session) {
    return <p>Session not found.</p>;
  }

  return (
    <div style={{ width: "100%", height: "100vh" }}>
        <JitsiMeeting
            domain="meet.jit.si"
            roomName={session.roomName}
            userInfo={{
                displayName: "Healthcare User",
                email: "user@example.com",
            }}
            getIFrameRef={(iframeRef) => {
                if (iframeRef) {
                iframeRef.style.width = "100%";
                iframeRef.style.height = "100vh";
                }
            }}
        />
    </div>
  );
}