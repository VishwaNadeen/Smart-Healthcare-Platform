import type { TelemedicineSession } from "../services/telemedicineApi";

export type JitsiMeetApi = {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  getAvailableDevices?: () => Promise<{
    audioInput?: MediaDeviceInfo[];
    audioOutput?: MediaDeviceInfo[];
    videoInput?: MediaDeviceInfo[];
  }>;
  getCurrentDevices?: () => Promise<{
    audioInput?: MediaDeviceInfo;
    audioOutput?: MediaDeviceInfo;
    videoInput?: MediaDeviceInfo;
  }>;
  setAudioInputDevice?: (
    deviceLabel?: string,
    deviceId?: string
  ) => Promise<void>;
  setAudioOutputDevice?: (
    deviceLabel?: string,
    deviceId?: string
  ) => Promise<void>;
  setVideoInputDevice?: (
    deviceLabel?: string,
    deviceId?: string
  ) => Promise<void>;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: Record<string, unknown>
    ) => JitsiMeetApi;
  }
}

export function loadJitsiExternalApiScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available"));
  }

  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-jitsi-external-api="true"]'
    );

    const handleLoad = () => resolve();
    const handleError = () =>
      reject(new Error("Failed to load the Jitsi Meet embed script"));

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.dataset.jitsiExternalApi = "true";
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.body.appendChild(script);
  });
}

export function getMeetingConfig(session: TelemedicineSession | null) {
  if (!session) {
    return {
      domain: "meet.jit.si",
      roomName: "",
    };
  }

  try {
    const url = new URL(session.meetingLink);
    const roomName = url.pathname.replace(/^\/+/, "");

    return {
      domain: url.hostname || "meet.jit.si",
      roomName: roomName || session.roomName || "",
    };
  } catch {
    return {
      domain: "meet.jit.si",
      roomName: session.roomName || "",
    };
  }
}

export function formatConsultationTime(totalSeconds: number) {
  const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const secs = String(totalSeconds % 60).padStart(2, "0");

  return `${hrs}:${mins}:${secs}`;
}
