import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ChatPanel from "../../components/telemedicine/ChatPanel";
import FileUploadPanel from "../../components/telemedicine/FileUploadPanel";
import PrescriptionForm from "../../components/telemedicine/PrescriptionForm";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import {
  getSessionByAppointmentId,
  updateSessionNotes,
  updateSessionStatus,
} from "../../services/telemedicineApi";
import type { TelemedicineSession } from "../../services/telemedicineApi";
import {
  canAccessTelemedicineSession,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";

type JitsiMeetApi = {
  dispose: () => void;
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
  const [savingNotes, setSavingNotes] = useState(false);
  const [noteSavedMessage, setNoteSavedMessage] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingError, setMeetingError] = useState("");
  const meetingContainerRef = useRef<HTMLDivElement | null>(null);
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

  async function handleSaveNotes() {
    if (!appointmentId || !session || !isDoctor) return;

    try {
      setSavingNotes(true);

      const updated = await updateSessionNotes(appointmentId, notes);

      setSession(updated.session);
      setNotes(updated.session.notes || "");
      setNoteSavedMessage("Notes saved successfully");

      setTimeout(() => {
        setNoteSavedMessage("");
      }, 2000);
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
      await updateSessionNotes(appointmentId, notes);
      await updateSessionStatus(appointmentId, "completed");
      navigate(`/session-summary/${session.appointmentId}`);
    } catch (error) {
      console.error("Failed to end call:", error);
      alert("Failed to end session");
    }
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
  const consultationStateLabel =
    session.status === "scheduled"
      ? isDoctor
        ? "Ready to start"
        : "Waiting for doctor"
      : session.status === "active"
        ? "Live"
        : session.status === "completed"
          ? "Completed"
          : "Cancelled";


  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-4 md:px-6">
              <div>
                <h1 className="text-xl font-bold text-slate-800 md:text-2xl">
                  Online Consultation
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Appointment ID: {session.appointmentId} · {consultationStateLabel}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-500">Meeting Timer</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatTime(seconds)}
                </p>
              </div>
            </div>

            <div className="relative flex aspect-video items-center justify-center bg-slate-900 px-6 text-center text-white">
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

            <div className="flex flex-wrap items-center gap-3 p-4 md:p-6">
              {isDoctor && session.status === "scheduled" ? (
                <button
                  onClick={handleStartCall}
                  className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
                >
                  Start Session
                </button>
              ) : null}

              {canOpenMeetingLink ? (
                <button
                  onClick={() => {
                    setMeetingError("");
                    setMeetingOpen((current) => !current);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  {meetingOpen
                    ? "Hide Meeting"
                    : isDoctor
                      ? "Open Meeting"
                      : "Join Call"}
                </button>
              ) : (
                <button
                  disabled
                  className="cursor-not-allowed rounded-lg bg-slate-300 px-4 py-2 font-medium text-slate-600"
                >
                  Waiting for doctor to start
                </button>
              )}

              {isDoctor && session.status === "active" ? (
                <button
                  onClick={handleEndCall}
                  className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
                >
                  End Session
                </button>
              ) : null}

              {session.status === "completed" ? (
                <Link
                  to={`/session-summary/${session.appointmentId}`}
                  className="rounded-lg bg-slate-700 px-4 py-2 font-medium text-white hover:bg-slate-800"
                >
                  View Summary
                </Link>
              ) : null}
            </div>
          </div>

          {appointmentId && role ? (
            <ChatPanel role={role} appointmentId={appointmentId} />
          ) : null}

          {appointmentId && role ? (
            <FileUploadPanel appointmentId={appointmentId} role={role} />
          ) : null}

          <div className="rounded-2xl bg-white p-4 shadow-lg md:p-6">
            {appointmentId && role ? (
              <PrescriptionForm
                role={role}
                appointmentId={appointmentId}
                doctorId={session.doctorId}
                patientId={session.patientId}
              />
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-lg md:p-6">
          <h2 className="mb-4 text-xl font-bold text-slate-800">
            Session Details
          </h2>

          <div className="space-y-3 text-sm md:text-base">
            <div>
              <span className="font-semibold">Doctor ID: </span>
              {session.doctorId}
            </div>
            <div>
              <span className="font-semibold">Patient ID: </span>
              {session.patientId}
            </div>
            <div>
              <span className="font-semibold">Date: </span>
              {session.scheduledDate}
            </div>
            <div>
              <span className="font-semibold">Time: </span>
              {session.scheduledTime}
            </div>
            <div>
              <span className="font-semibold">Status: </span>
              {session.status}
            </div>
          </div>

          {isDoctor ? (
            <div className="mt-6">
              <label className="mb-2 block font-semibold">Doctor Notes</label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write doctor notes here..."
                className="min-h-[180px] w-full rounded-xl border p-3"
              />

              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-60"
                >
                  {savingNotes ? "Saving..." : "Save Notes"}
                </button>

                {noteSavedMessage ? (
                  <span className="text-sm text-emerald-600">
                    {noteSavedMessage}
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-700">Doctor Notes</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {session.notes?.trim()
                  ? session.notes
                  : "Notes will appear here when the doctor shares them."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
