import { useEffect, useRef, useState } from "react";
import type { TelemedicineSession } from "../../services/telemedicineApi";
import {
  getMeetingConfig,
  loadJitsiExternalApiScript,
  type JitsiMeetApi,
} from "../../utils/consultationUtils";

type UseConsultationMeetingParams = {
  session: TelemedicineSession | null;
  isDoctor: boolean;
  canOpenMeetingLink: boolean;
  username: string | null;
  email: string | null;
  onDoctorEndCall: () => void;
};

type ProceedHangupOptions = {
  skipDoctorEndCall?: boolean;
  suppressOpenAlert?: boolean;
};

export function consultationMeeting({
  session,
  isDoctor,
  canOpenMeetingLink,
  username,
  email,
  onDoctorEndCall,
}: UseConsultationMeetingParams) {
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingReady, setMeetingReady] = useState(false);
  const [meetingError, setMeetingError] = useState("");
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [participantsPaneOpen, setParticipantsPaneOpen] = useState(false);
  const [isDevicePanelOpen, setIsDevicePanelOpen] = useState(false);
  const [devicePanelLoading, setDevicePanelLoading] = useState(false);
  const [devicePanelError, setDevicePanelError] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>(
    []
  );
  const [audioOutputDevices, setAudioOutputDevices] = useState<
    MediaDeviceInfo[]
  >([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>(
    []
  );
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("");
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState("");
  const [selectedVideoInputId, setSelectedVideoInputId] = useState("");
  const meetingContainerRef = useRef<HTMLDivElement | null>(null);
  const devicePanelRef = useRef<HTMLDivElement | null>(null);
  const jitsiApiRef = useRef<JitsiMeetApi | null>(null);
  const { domain, roomName } = getMeetingConfig(session);

  function resetMeetingError() {
    setMeetingError("");
  }

  function openMeeting() {
    setMeetingOpen(true);
  }

  function runMeetingCommand(command: string, ...args: unknown[]) {
    if (!meetingOpen || !jitsiApiRef.current) {
      alert("Open the meeting first");
      return false;
    }

    jitsiApiRef.current.executeCommand(command, ...args);
    return true;
  }

  function handleToggleAudio() {
    if (!runMeetingCommand("toggleAudio")) return;
    setAudioMuted((current) => !current);
  }

  function handleToggleVideo() {
    if (!runMeetingCommand("toggleVideo")) return;
    setVideoMuted((current) => !current);
  }

  function handleToggleParticipants() {
    const nextOpen = !participantsPaneOpen;

    if (!runMeetingCommand("toggleParticipantsPane", nextOpen)) return;
    setParticipantsPaneOpen(nextOpen);
  }

  async function handleInvitePeople() {
    if (!session?.meetingLink) {
      alert("Meeting link is not available");
      return;
    }

    const shareData = {
      title: "Online Consultation",
      text: `Join this consultation room: ${session.roomName || session.meetingLink}`,
      url: session.meetingLink,
    };

    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share(shareData);
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(session.meetingLink);
      } else {
        throw new Error("Sharing is not available");
      }

      setInviteMessage("Meeting link ready to share");
      window.setTimeout(() => {
        setInviteMessage("");
      }, 2000);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      console.error("Failed to share meeting link:", error);
      alert("Failed to share meeting link");
    }
  }

  async function loadMeetingDevices() {
    if (!meetingOpen || !jitsiApiRef.current) {
      setDevicePanelError("Open the meeting first");
      return;
    }

    try {
      setDevicePanelLoading(true);
      setDevicePanelError("");

      const apiDevices =
        typeof jitsiApiRef.current.getAvailableDevices === "function"
          ? await jitsiApiRef.current.getAvailableDevices()
          : null;
      const currentDevices =
        typeof jitsiApiRef.current.getCurrentDevices === "function"
          ? await jitsiApiRef.current.getCurrentDevices()
          : null;

      const browserDevices =
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.enumerateDevices === "function"
          ? await navigator.mediaDevices.enumerateDevices()
          : [];

      const nextAudioInputDevices =
        apiDevices?.audioInput && apiDevices.audioInput.length > 0
          ? apiDevices.audioInput
          : browserDevices.filter((device) => device.kind === "audioinput");
      const nextAudioOutputDevices =
        apiDevices?.audioOutput && apiDevices.audioOutput.length > 0
          ? apiDevices.audioOutput
          : browserDevices.filter((device) => device.kind === "audiooutput");
      const nextVideoInputDevices =
        apiDevices?.videoInput && apiDevices.videoInput.length > 0
          ? apiDevices.videoInput
          : browserDevices.filter((device) => device.kind === "videoinput");

      setAudioInputDevices(nextAudioInputDevices);
      setAudioOutputDevices(nextAudioOutputDevices);
      setVideoInputDevices(nextVideoInputDevices);
      setSelectedAudioInputId(
        currentDevices?.audioInput?.deviceId ||
          nextAudioInputDevices[0]?.deviceId ||
          ""
      );
      setSelectedAudioOutputId(
        currentDevices?.audioOutput?.deviceId ||
          nextAudioOutputDevices[0]?.deviceId ||
          ""
      );
      setSelectedVideoInputId(
        currentDevices?.videoInput?.deviceId ||
          nextVideoInputDevices[0]?.deviceId ||
          ""
      );
    } catch (error) {
      setDevicePanelError(
        error instanceof Error
          ? error.message
          : "Failed to load microphone and camera devices"
      );
    } finally {
      setDevicePanelLoading(false);
    }
  }

  function handleMeetingSettings() {
    const nextOpen = !isDevicePanelOpen;
    setIsDevicePanelOpen(nextOpen);

    if (nextOpen) {
      void loadMeetingDevices();
    }
  }

  async function handleSelectAudioInput(device: MediaDeviceInfo) {
    if (
      !jitsiApiRef.current ||
      typeof jitsiApiRef.current.setAudioInputDevice !== "function"
    ) {
      setDevicePanelError("Microphone switching is not available");
      return;
    }

    try {
      await jitsiApiRef.current.setAudioInputDevice(device.label, device.deviceId);
      setSelectedAudioInputId(device.deviceId);
      setDevicePanelError("");
    } catch (error) {
      setDevicePanelError(
        error instanceof Error ? error.message : "Failed to switch microphone"
      );
    }
  }

  async function handleSelectVideoInput(device: MediaDeviceInfo) {
    if (
      !jitsiApiRef.current ||
      typeof jitsiApiRef.current.setVideoInputDevice !== "function"
    ) {
      setDevicePanelError("Camera switching is not available");
      return;
    }

    try {
      await jitsiApiRef.current.setVideoInputDevice(device.label, device.deviceId);
      setSelectedVideoInputId(device.deviceId);
      setDevicePanelError("");
    } catch (error) {
      setDevicePanelError(
        error instanceof Error ? error.message : "Failed to switch camera"
      );
    }
  }

  async function handleSelectAudioOutput(device: MediaDeviceInfo) {
    if (
      !jitsiApiRef.current ||
      typeof jitsiApiRef.current.setAudioOutputDevice !== "function"
    ) {
      setDevicePanelError("Speaker switching is not available");
      return;
    }

    try {
      await jitsiApiRef.current.setAudioOutputDevice(
        device.label,
        device.deviceId
      );
      setSelectedAudioOutputId(device.deviceId);
      setDevicePanelError("");
    } catch (error) {
      setDevicePanelError(
        error instanceof Error ? error.message : "Failed to switch speaker"
      );
    }
  }

  function proceedHangupMeeting(options: ProceedHangupOptions = {}) {
    const { skipDoctorEndCall = false, suppressOpenAlert = false } = options;

    if (!meetingOpen || !jitsiApiRef.current) {
      if (!skipDoctorEndCall && isDoctor && session?.status === "active") {
        onDoctorEndCall();
      } else if (!suppressOpenAlert) {
        alert("Open the meeting first");
      }
      return false;
    }

    jitsiApiRef.current.executeCommand("hangup");
    setMeetingOpen(false);
    setMeetingReady(false);
    setParticipantsPaneOpen(false);

    if (!skipDoctorEndCall && isDoctor && session?.status === "active") {
      onDoctorEndCall();
    }

    return true;
  }

  useEffect(() => {
    if (!meetingOpen || !canOpenMeetingLink || !roomName) {
      jitsiApiRef.current?.dispose();
      jitsiApiRef.current = null;
      setMeetingReady(false);
      setIsDevicePanelOpen(false);
      setDevicePanelError("");
      setParticipantsPaneOpen(false);
      return;
    }

    let isCancelled = false;

    async function mountMeeting() {
      try {
        setMeetingLoading(true);
        setMeetingError("");

        await loadJitsiExternalApiScript();

        if (
          isCancelled ||
          !meetingContainerRef.current ||
          !window.JitsiMeetExternalAPI
        ) {
          return;
        }

        jitsiApiRef.current?.dispose();
        jitsiApiRef.current = null;
        setMeetingReady(false);
        meetingContainerRef.current.innerHTML = "";

        jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, {
          roomName,
          parentNode: meetingContainerRef.current,
          width: "100%",
          height: "100%",
          userInfo: {
            displayName: username || (isDoctor ? "Doctor" : "Patient"),
            email: email || undefined,
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            prejoinConfig: {
              enabled: false,
            },
            toolbarButtons: [
              "chat",
              "closedcaptions",
              "desktop",
              "download",
              "embedmeeting",
              "feedback",
              "filmstrip",
              "fullscreen",
              "help",
              "profile",
              "raisehand",
              "security",
              "shareaudio",
              "sharedvideo",
              "shortcuts",
              "stats",
              "tileview",
              "videoquality",
            ],
          },
        });
        setMeetingReady(true);
      } catch (error) {
        setMeetingReady(false);
        setMeetingError(
          error instanceof Error
            ? error.message
            : "Failed to open the embedded meeting"
        );
      } finally {
        if (!isCancelled) {
          setMeetingLoading(false);
        }
      }
    }

    void mountMeeting();

    return () => {
      isCancelled = true;
      jitsiApiRef.current?.dispose();
      jitsiApiRef.current = null;
      setMeetingReady(false);
    };
  }, [canOpenMeetingLink, domain, email, isDoctor, meetingOpen, roomName, username]);

  useEffect(() => {
    if (!isDevicePanelOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!devicePanelRef.current) {
        return;
      }

      const target = event.target;

      if (target instanceof Node && !devicePanelRef.current.contains(target)) {
        setIsDevicePanelOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isDevicePanelOpen]);

  return {
    meetingOpen,
    meetingReady,
    meetingLoading,
    meetingError,
    audioMuted,
    videoMuted,
    participantsPaneOpen,
    isDevicePanelOpen,
    devicePanelLoading,
    devicePanelError,
    inviteMessage,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    meetingContainerRef,
    devicePanelRef,
    resetMeetingError,
    openMeeting,
    handleToggleAudio,
    handleToggleVideo,
    handleToggleParticipants,
    handleInvitePeople,
    handleMeetingSettings,
    handleSelectAudioInput,
    handleSelectAudioOutput,
    handleSelectVideoInput,
    proceedHangupMeeting,
  };
}
