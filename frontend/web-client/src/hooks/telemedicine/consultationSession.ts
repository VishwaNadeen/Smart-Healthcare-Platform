import { useEffect, useState } from "react";
import { getPatientSummaryByAuthUserId } from "../../services/patientApi";
import {
  getSessionByAppointmentId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";

type UseConsultationSessionParams = {
  appointmentId?: string;
  authToken: string | null;
};

export function consultationSession({
  appointmentId,
  authToken,
}: UseConsultationSessionParams) {
  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [patientAge, setPatientAge] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let timerId: number | undefined;

    if (session?.status === "active") {
      timerId = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerId !== undefined) {
        window.clearInterval(timerId);
      }
    };
  }, [session?.status]);

  useEffect(() => {
    async function loadSession() {
      if (!appointmentId) {
        setLoading(false);
        return;
      }

      try {
        const response = await getSessionByAppointmentId(appointmentId);
        setSession(response);
        setNotes(response.notes || "");
      } catch (error) {
        console.error("Failed to load consultation:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadSession();
  }, [appointmentId]);

  useEffect(() => {
    let isMounted = true;

    async function loadPatientAge() {
      if (!authToken || !session?.patientId) {
        if (isMounted) {
          setPatientAge(null);
        }
        return;
      }

      try {
        const patientSummary = await getPatientSummaryByAuthUserId(
          authToken,
          session.patientId
        );

        if (isMounted) {
          setPatientAge(patientSummary.age);
        }
      } catch {
        if (isMounted) {
          setPatientAge(null);
        }
      }
    }

    void loadPatientAge();

    return () => {
      isMounted = false;
    };
  }, [authToken, session?.patientId]);

  return {
    session,
    setSession,
    notes,
    setNotes,
    loading,
    patientAge,
    seconds,
  };
}
