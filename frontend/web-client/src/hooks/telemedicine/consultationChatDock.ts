import { useEffect, useRef, useState } from "react";
import { getMessagesByAppointmentId } from "../../services/telemedicineApi";
import type { TelemedicineActorRole } from "../../utils/telemedicineAuth";

function playIncomingChatSound() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      660,
      audioContext.currentTime + 0.18
    );

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.04,
      audioContext.currentTime + 0.02
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + 0.22
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.22);

    window.setTimeout(() => {
      void audioContext.close().catch(() => undefined);
    }, 300);
  } catch (error) {
    console.error("Failed to play incoming chat sound:", error);
  }
}

type UseConsultationChatDockParams = {
  appointmentId?: string;
  role: TelemedicineActorRole | null;
};

export function consultationChatDock({
  appointmentId,
  role,
}: UseConsultationChatDockParams) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef<number | null>(null);

  useEffect(() => {
    setUnreadChatCount(0);
    lastMessageCountRef.current = null;
  }, [appointmentId, role]);

  useEffect(() => {
    if (!isChatOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!chatPanelRef.current) {
        return;
      }

      const target = event.target;

      if (target instanceof Node && !chatPanelRef.current.contains(target)) {
        setIsChatOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isChatOpen]);

  useEffect(() => {
    if (!appointmentId || !role) {
      return;
    }

    const currentAppointmentId = appointmentId;
    let isCancelled = false;

    async function loadChatMessageCount() {
      try {
        const response = await getMessagesByAppointmentId(currentAppointmentId);
        const nextMessages = response.data || [];
        const nextCount = nextMessages.length;
        const previousCount = lastMessageCountRef.current;

        if (previousCount === null) {
          lastMessageCountRef.current = nextCount;
          if (!isCancelled) {
            setUnreadChatCount(isChatOpen ? 0 : nextCount);
          }
          return;
        }

        if (nextCount > previousCount) {
          const addedCount = nextCount - previousCount;
          const incomingMessages = nextMessages.slice(previousCount).filter((message) => {
            return (
              message.senderRole !== role &&
              message.senderRole !== "system"
            );
          });

          if (!isCancelled) {
            setUnreadChatCount((current) => (isChatOpen ? 0 : current + addedCount));
          }

          if (incomingMessages.length > 0) {
            playIncomingChatSound();
          }
        } else if (nextCount < previousCount && !isCancelled) {
          setUnreadChatCount(isChatOpen ? 0 : nextCount);
        }

        lastMessageCountRef.current = nextCount;
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to refresh chat count:", error);
        }
      }
    }

    void loadChatMessageCount();
    const intervalId = window.setInterval(() => {
      void loadChatMessageCount();
    }, 3000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [appointmentId, role, isChatOpen]);

  useEffect(() => {
    if (isChatOpen) {
      setUnreadChatCount(0);
    }
  }, [isChatOpen]);

  return {
    isChatOpen,
    setIsChatOpen,
    unreadChatCount,
    chatPanelRef,
  };
}
