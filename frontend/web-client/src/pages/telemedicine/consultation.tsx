import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ChatPanel from "../../components/telemedicine/ChatPanel";
import {
  CameraIcon,
  HangupIcon,
  InviteIcon,
  MicIcon,
  ParticipantsIcon,
  SettingsIcon,
} from "../../components/telemedicine/MeetingControlIcons";
import PrescriptionForm, {
  type PrescriptionFormHandle,
} from "../../components/telemedicine/PrescriptionForm";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import { getPatientSummaryByAuthUserId } from "../../services/patientApi";
import {
  disconnectTelemedicinePresence,
  getMessagesByAppointmentId,
  getSessionByAppointmentId,
  heartbeatTelemedicinePresence,
  updateConsultationNotes,
  updateSessionStatus,
} from "../../services/telemedicineApi";
import type { TelemedicineSession } from "../../services/telemedicineApi";
import {
  canAccessTelemedicineSession,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";

type JitsiMeetApi = {
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
  setAudioInputDevice?: (deviceLabel?: string, deviceId?: string) => Promise<void>;
  setAudioOutputDevice?: (deviceLabel?: string, deviceId?: string) => Promise<void>;
  setVideoInputDevice?: (deviceLabel?: string, deviceId?: string) => Promise<void>;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: Record<string, unknown>
    ) => JitsiMeetApi;
  }
}

function loadJitsiExternalApiScript(): Promise<void> {
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

function getMeetingConfig(session: TelemedicineSession | null) {
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

export default function Consultation() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const auth = getStoredTelemedicineAuth();
  const role = auth.actorRole;
  const isDoctor = role === "doctor";

  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [, setSavingNotes] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingError, setMeetingError] = useState("");
  const [patientAge, setPatientAge] = useState<number | null>(null);
  const [bothParticipantsConnected, setBothParticipantsConnected] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [participantsPaneOpen, setParticipantsPaneOpen] = useState(false);
  const [isDevicePanelOpen, setIsDevicePanelOpen] = useState(false);
  const [isHangupConfirmOpen, setIsHangupConfirmOpen] = useState(false);
  const [devicePanelLoading, setDevicePanelLoading] = useState(false);
  const [devicePanelError, setDevicePanelError] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>(
    []
  );
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>(
    []
  );
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>(
    []
  );
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("");
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState("");
  const [selectedVideoInputId, setSelectedVideoInputId] = useState("");
  const meetingContainerRef = useRef<HTMLDivElement | null>(null);
  const prescriptionFormRef = useRef<PrescriptionFormHandle | null>(null);
  const devicePanelRef = useRef<HTMLDivElement | null>(null);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);
  const lastMessageCountRef = useRef<number | null>(null);
  const jitsiApiRef = useRef<JitsiMeetApi | null>(null);
  const canPatientJoin = session?.status === "active";
  const canOpenMeetingLink = Boolean(isDoctor || canPatientJoin);
  const { domain, roomName } = getMeetingConfig(session);

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

    loadSession();
  }, [appointmentId]);

  useEffect(() => {
    if (!appointmentId || !auth.userId || !role || !session?._id) {
      return;
    }

    const currentAppointmentId = appointmentId;
    let isCancelled = false;

    async function sendHeartbeat() {
      try {
        const response = await heartbeatTelemedicinePresence(currentAppointmentId);

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
  }, [appointmentId, auth.userId, role, session?._id]);

  useEffect(() => {
    let isMounted = true;

    async function loadPatientAge() {
      if (!auth.token || !session?.patientId) {
        if (isMounted) {
          setPatientAge(null);
        }
        return;
      }

      try {
        const patientSummary = await getPatientSummaryByAuthUserId(
          auth.token,
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

    loadPatientAge();

    return () => {
      isMounted = false;
    };
  }, [auth.token, session?.patientId]);

  async function handleStartCall() {
    if (!appointmentId || !session || !isDoctor) return;

    try {
      const updated = await updateSessionStatus(appointmentId, "active");
      setSession(updated.session);
    } catch (error) {
      console.error("Failed to start session:", error);
      alert("Failed to start session");
    }
  }

  async function handleJoinMeeting() {
    if (!appointmentId || !session || !canOpenMeetingLink) {
      return;
    }

    try {
      setMeetingError("");

      if (isDoctor && session.status === "scheduled") {
        const updated = await updateSessionStatus(appointmentId, "active");
        setSession(updated.session);
      }

      setMeetingOpen(true);
    } catch (error) {
      console.error("Failed to join meeting:", error);
      alert("Failed to join meeting");
    }
  }

  async function handleSaveNotes() {
    if (!appointmentId || !session || !isDoctor) return;

    try {
      setSavingNotes(true);

      const updated = await updateConsultationNotes({
        appointmentId,
        notes,
      });

      setSession(updated.data);
      setNotes(updated.data.notes || "");
    } catch (error) {
      console.error("Failed to save notes:", error);
      alert("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleEndCall() {
    if (!appointmentId || !session || !isDoctor) return;

    try {
      if (prescriptionFormRef.current) {
        await prescriptionFormRef.current.saveAll();
      } else {
        await updateConsultationNotes({
          appointmentId,
          notes,
        });
      }

      await updateSessionStatus(appointmentId, "completed");
      navigate(`/session-summary/${session.appointmentId}`);
    } catch (error) {
      console.error("Failed to end call:", error);
      if (
        error instanceof Error &&
        error.message === "Please fill all prescription fields"
      ) {
        return;
      }

      alert("Failed to end session");
    }
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
        error instanceof Error
          ? error.message
          : "Failed to switch microphone"
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
      await jitsiApiRef.current.setAudioOutputDevice(device.label, device.deviceId);
      setSelectedAudioOutputId(device.deviceId);
      setDevicePanelError("");
    } catch (error) {
      setDevicePanelError(
        error instanceof Error ? error.message : "Failed to switch speaker"
      );
    }
  }

  function proceedHangupMeeting() {
    if (!meetingOpen || !jitsiApiRef.current) {
      if (isDoctor && session?.status === "active") {
        void handleEndCall();
      } else {
        alert("Open the meeting first");
      }
      return;
    }

    jitsiApiRef.current.executeCommand("hangup");
    setMeetingOpen(false);
    setParticipantsPaneOpen(false);

    if (isDoctor && session?.status === "active") {
      void handleEndCall();
    }
  }

  function handleHangupMeeting() {
    if (isDoctor) {
      setIsHangupConfirmOpen(true);
      return;
    }

    proceedHangupMeeting();
  }

  function formatTime(totalSeconds: number) {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
      2,
      "0"
    );
    const secs = String(totalSeconds % 60).padStart(2, "0");

    return `${hrs}:${mins}:${secs}`;
  }

  useEffect(() => {
    if (!meetingOpen || !canOpenMeetingLink || !roomName) {
      jitsiApiRef.current?.dispose();
      jitsiApiRef.current = null;
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
        meetingContainerRef.current.innerHTML = "";

          jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, {
            roomName,
            parentNode: meetingContainerRef.current,
            width: "100%",
            height: "100%",
          userInfo: {
            displayName: auth.username || (isDoctor ? "Doctor" : "Patient"),
            email: auth.email || undefined,
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
      } catch (error) {
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

    mountMeeting();

    return () => {
      isCancelled = true;
      jitsiApiRef.current?.dispose();
      jitsiApiRef.current = null;
    };
  }, [
    auth.email,
    auth.username,
    canOpenMeetingLink,
    domain,
    isDoctor,
    meetingOpen,
    roomName,
  ]);

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

  useEffect(() => {
    if (!appointmentId || !role) {
      return;
    }

    const currentAppointmentId = appointmentId;
    let isCancelled = false;

    async function loadChatMessageCount() {
      try {
        const response = await getMessagesByAppointmentId(currentAppointmentId);
        const nextCount = response.data?.length || 0;
        const previousCount = lastMessageCountRef.current;

        if (previousCount === null) {
          lastMessageCountRef.current = nextCount;
          return;
        }

        if (nextCount > previousCount) {
          const addedCount = nextCount - previousCount;

          if (!isCancelled) {
            setUnreadChatCount((current) => (isChatOpen ? 0 : current + addedCount));
          }
        } else if (nextCount < previousCount && !isCancelled) {
          setUnreadChatCount(0);
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

  if (!auth.userId || !role) {
    return (
      <TelemedicineAccessNotice
        title="Consultation access needs login data"
        description="This page needs a valid login session with role and user id. Please sign in again."
        actionLabel="Go to Login"
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-lg font-medium text-slate-700">
          Loading consultation...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-lg font-medium text-red-600">Session not found</p>
      </div>
    );
  }

  if (!canAccessTelemedicineSession(auth, session)) {
    return (
      <TelemedicineAccessNotice
        title="Consultation access denied"
        description="This appointment belongs to a different doctor or patient account."
        actionLabel={isDoctor ? "Doctor Sessions" : "Patient Sessions"}
        actionTo={isDoctor ? "/doctor-sessions" : "/patient-sessions"}
      />
    );
  }
  const patientName =
    session.patient?.fullName ||
    (session as TelemedicineSession & { patientName?: string }).patientName ||
    "Patient";
  const patientDisplayName =
    patientAge !== null ? `${patientName} - ${patientAge}Y` : patientName;
  const doctorName =
    session.doctor?.fullName ||
    session.doctorName ||
    session.doctor?.name ||
    "Doctor";
  const showPrescriptionPanel = isDoctor;
  const identityLabel = isDoctor ? "Patient" : "Doctor";
  const identityDisplayName = isDoctor ? patientDisplayName : doctorName;
  const showMeetingControls = meetingOpen && canOpenMeetingLink;


  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-100 p-3 sm:p-4 lg:p-6">
      <div className="mx-auto flex h-full max-w-7xl min-h-0 flex-col">
        <div
          className={`grid flex-1 min-h-0 grid-cols-1 gap-4 lg:gap-6 ${
            showPrescriptionPanel
              ? "lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]"
              : ""
          }`}
        >
          <div className="min-h-0">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-lg">
              <div className="grid items-start gap-4 border-b px-4 py-4 md:grid-cols-[1fr_auto_1fr] md:px-6">
                <div>
                  <p className="text-sm font-medium text-slate-500">{identityLabel}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900 md:text-lg">
                    {identityDisplayName}
                  </p>
                </div>

                <div className="text-center">
                  <h1 className="text-xl font-bold text-slate-800 md:text-2xl">
                    Online Consultation
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Room Name: {session.roomName || "Not available"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-500">Meeting Timer</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatTime(seconds)}
                  </p>
                </div>
              </div>

              <div className="relative flex min-h-[16rem] flex-1 items-center justify-center bg-slate-900 px-6 text-center text-white sm:min-h-[20rem]">
                {meetingOpen && canOpenMeetingLink ? (
                  <>
                    <div
                      ref={meetingContainerRef}
                      className="h-full w-full overflow-hidden"
                    />

                    {meetingLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/85 px-6 text-center">
                        <p className="text-sm font-medium text-slate-200">
                          Loading meeting...
                        </p>
                      </div>
                    ) : null}

                    {meetingError ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 px-6 text-center">
                        <div>
                          <p className="text-lg font-semibold">
                            Meeting failed to load
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {meetingError}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div>
                    <p className="text-lg font-semibold">
                      {isDoctor
                        ? "Doctor Consultation Room"
                        : "Patient Consultation Room"}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {session.status === "active"
                        ? "The video session is active."
                        : session.status === "scheduled"
                          ? isDoctor
                            ? "Start the session when you are ready to see the patient."
                            : "Please wait until your doctor starts the consultation."
                          : session.status === "completed"
                            ? "This consultation has ended."
                            : "This consultation is not available."}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-stretch justify-center gap-3 p-4 md:p-6">
                {isDoctor && session.status === "scheduled" ? (
                  <button
                    onClick={handleStartCall}
                    className="inline-flex min-h-11 min-w-[10.5rem] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-center font-medium text-white hover:bg-emerald-700"
                  >
                    Start Session
                  </button>
                ) : null}

                {canOpenMeetingLink ? (
                  meetingOpen ? (
                    null
                  ) : (
                    <button
                      onClick={() => {
                        void handleJoinMeeting();
                      }}
                      className="inline-flex min-h-11 min-w-[10.5rem] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
                    >
                      Join Meeting
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="inline-flex min-h-11 min-w-[10.5rem] items-center justify-center rounded-lg bg-slate-300 px-4 py-2 text-center font-medium text-slate-600"
                  >
                    Waiting for doctor to start
                  </button>
                )}

                {showMeetingControls ? (
                  <div className="relative flex w-full flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleToggleAudio}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition ${
                        audioMuted
                          ? "border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:text-blue-700"
                          : "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:text-rose-700"
                      }`}
                      aria-label={audioMuted ? "Unmute microphone" : "Mute microphone"}
                      title={audioMuted ? "Unmute microphone" : "Mute microphone"}
                    >
                      <MicIcon />
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleVideo}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition ${
                        videoMuted
                          ? "border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:text-blue-700"
                          : "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:text-rose-700"
                      }`}
                      aria-label={videoMuted ? "Turn camera on" : "Turn camera off"}
                      title={videoMuted ? "Turn camera on" : "Turn camera off"}
                    >
                      <CameraIcon />
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleParticipants}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition ${
                        participantsPaneOpen
                          ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:text-blue-600"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:text-blue-600"
                      }`}
                      aria-label={
                        participantsPaneOpen
                          ? "Hide participants"
                          : "Show participants"
                      }
                      title={
                        participantsPaneOpen
                          ? "Hide participants"
                          : "Show participants"
                      }
                    >
                      <ParticipantsIcon />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleInvitePeople()}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
                      aria-label="Invite people"
                      title="Invite people"
                    >
                      <InviteIcon />
                    </button>

                    <button
                      type="button"
                      onClick={handleMeetingSettings}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
                      aria-label="Microphone and camera devices"
                      title="Microphone and camera devices"
                    >
                      <SettingsIcon />
                    </button>

                    <button
                      type="button"
                      onClick={handleHangupMeeting}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-rose-600 text-white transition hover:bg-rose-700"
                      aria-label="Hang up meeting"
                      title="Hang up meeting"
                    >
                      <HangupIcon />
                    </button>

                    {isDevicePanelOpen ? (
                      <div
                        ref={devicePanelRef}
                        className="absolute bottom-full right-0 z-20 mb-3 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-[#111111] text-white shadow-[0_18px_40px_rgba(15,23,42,0.26)]"
                      >
                        <div className="border-b border-white/10 px-4 py-3">
                          <p className="text-sm font-semibold text-white">
                            Devices
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Select microphone and camera for this consultation.
                          </p>
                        </div>

                        {devicePanelLoading ? (
                          <div className="px-4 py-5 text-sm text-slate-300">
                            Loading devices...
                          </div>
                        ) : (
                          <div className="max-h-[26rem] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            <div className="border-b border-white/10 px-4 py-3">
                              <p className="text-sm font-semibold text-white">
                                Microphones
                              </p>
                              <div className="mt-3 space-y-1">
                                {audioInputDevices.length > 0 ? (
                                  audioInputDevices.map((device, index) => {
                                    const deviceName =
                                      device.label || `Microphone ${index + 1}`;
                                    const isSelected =
                                      selectedAudioInputId === device.deviceId;

                                    return (
                                      <button
                                        key={device.deviceId || `${deviceName}-${index}`}
                                        type="button"
                                        onClick={() => void handleSelectAudioInput(device)}
                                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                                          isSelected
                                            ? "bg-white/10 text-white"
                                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                                        }`}
                                      >
                                        <span className="min-w-0 truncate">
                                          {deviceName}
                                        </span>
                                        {isSelected ? (
                                          <span className="ml-3 inline-flex items-center text-emerald-400 before:text-sm before:leading-none before:content-['\\2713']" />
                                        ) : null}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <p className="text-sm text-slate-400">
                                    No microphones found.
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="border-b border-white/10 px-4 py-3">
                              <p className="text-sm font-semibold text-white">
                                Speakers
                              </p>
                              <div className="mt-3 space-y-1">
                                {audioOutputDevices.length > 0 ? (
                                  audioOutputDevices.map((device, index) => {
                                    const deviceName =
                                      device.label || `Speaker ${index + 1}`;
                                    const isSelected =
                                      selectedAudioOutputId === device.deviceId;

                                    return (
                                      <button
                                        key={device.deviceId || `${deviceName}-${index}`}
                                        type="button"
                                        onClick={() => void handleSelectAudioOutput(device)}
                                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                                          isSelected
                                            ? "bg-white/10 text-white"
                                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                                        }`}
                                      >
                                        <span className="min-w-0 truncate">
                                          {deviceName}
                                        </span>
                                        {isSelected ? (
                                          <span className="ml-3 inline-flex items-center text-emerald-400 before:text-sm before:leading-none before:content-['\\2713']" />
                                        ) : null}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <p className="text-sm text-slate-400">
                                    No speakers found.
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="px-4 py-3">
                              <p className="text-sm font-semibold text-white">
                                Cameras
                              </p>
                              <div className="mt-3 space-y-1">
                                {videoInputDevices.length > 0 ? (
                                  videoInputDevices.map((device, index) => {
                                    const deviceName =
                                      device.label || `Camera ${index + 1}`;
                                    const isSelected =
                                      selectedVideoInputId === device.deviceId;

                                    return (
                                      <button
                                        key={device.deviceId || `${deviceName}-${index}`}
                                        type="button"
                                        onClick={() => void handleSelectVideoInput(device)}
                                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                                          isSelected
                                            ? "bg-white/10 text-white"
                                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                                        }`}
                                      >
                                        <span className="min-w-0 truncate">
                                          {deviceName}
                                        </span>
                                        {isSelected ? (
                                          <span className="ml-3 inline-flex items-center text-emerald-400 before:text-sm before:leading-none before:content-['\\2713']" />
                                        ) : null}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <p className="text-sm text-slate-400">
                                    No cameras found.
                                  </p>
                                )}

                              </div>
                            </div>
                          </div>
                        )}

                        {devicePanelError ? (
                          <div className="border-t border-white/10 px-4 py-3 text-xs text-rose-300">
                            {devicePanelError}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {inviteMessage ? (
                  <p className="self-center text-sm font-medium text-emerald-600">
                    {inviteMessage}
                  </p>
                ) : null}

                {session.status === "completed" ? (
                  <Link
                    to={`/session-summary/${session.appointmentId}`}
                    className="inline-flex min-h-11 min-w-[10.5rem] items-center justify-center rounded-lg bg-slate-700 px-4 py-2 text-center font-medium text-white hover:bg-slate-800"
                  >
                    View Summary
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          {showPrescriptionPanel ? (
            <div className="min-h-0 overflow-hidden rounded-2xl bg-white p-4 shadow-lg md:p-6">
              <div className="h-full min-h-0">
                {appointmentId && role ? (
                  <PrescriptionForm
                    ref={prescriptionFormRef}
                    role={role}
                    appointmentId={appointmentId}
                    doctorId={session.doctorId}
                    patientId={session.patientId}
                    consultationNotes={notes}
                    onConsultationNotesChange={setNotes}
                    onSaveConsultationNotes={handleSaveNotes}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

      </div>

      {isHangupConfirmOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
            <h2 className="text-xl font-bold text-slate-900">
              End Consultation?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This will hang up the meeting, save the medical notes and
              prescriptions, and complete the session.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsHangupConfirmOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsHangupConfirmOpen(false);
                  proceedHangupMeeting();
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                End Consultation
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {appointmentId && role ? (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {isChatOpen ? (
            <div
              ref={chatPanelRef}
              className="w-[22rem] max-w-[calc(100vw-2rem)] md:w-[24rem]"
            >
              <ChatPanel
                role={role}
                appointmentId={appointmentId}
                canSendMessages={bothParticipantsConnected}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setIsChatOpen((current) => !current)}
            className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:bg-blue-700"
            aria-label={isChatOpen ? "Hide chat" : "Open chat"}
            title={isChatOpen ? "Hide chat" : "Open chat"}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {!isChatOpen && unreadChatCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold leading-none text-white shadow-sm">
                {unreadChatCount > 99 ? "99+" : unreadChatCount}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}
    </div>
  );
}




