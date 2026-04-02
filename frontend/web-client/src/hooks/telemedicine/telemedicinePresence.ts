import { useEffect, useState } from "react";
import {
  disconnectTelemedicinePresence,
  heartbeatTelemedicinePresence,
} from "../../services/telemedicineApi";
import type { TelemedicineActorRole } from "../../utils/telemedicineAuth";

type UseTelemedicinePresenceParams = {
  appointmentId?: string;
  userId: string | null;
  role: TelemedicineActorRole | null;
  sessionId?: string;
};

export function telemedicinePresence({
  appointmentId,
  userId,
  role,
  sessionId,
}: UseTelemedicinePresenceParams) {
  const [bothParticipantsConnected, setBothParticipantsConnected] =
    useState(false);

  useEffect(() => {
    if (!appointmentId || !userId || !role || !sessionId) {
      return;
    }

    const currentAppointmentId = appointmentId;
    let isCancelled = false;

    async function sendHeartbeat() {
      try {
        const response =
          await heartbeatTelemedicinePresence(currentAppointmentId);

        if (!isCancelled) {
          setBothParticipantsConnected(Boolean(response.data?.bothConnected));
        }
      } catch (error) {
        if (!isCancelled) {
          setBothParticipantsConnected(false);
          console.error("Failed to update consultation presence:", error);
        }
      }
    }

    void sendHeartbeat();

    const intervalId = window.setInterval(() => {
      void sendHeartbeat();
    }, 5000);

    const handlePageHide = () => {
      void disconnectTelemedicinePresence(currentAppointmentId).catch(() => {});
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      isCancelled = true;
      setBothParticipantsConnected(false);
      window.clearInterval(intervalId);
      window.removeEventListener("pagehide", handlePageHide);
      void disconnectTelemedicinePresence(currentAppointmentId).catch(() => {});
    };
  }, [appointmentId, role, sessionId, userId]);

  return bothParticipantsConnected;
}
