import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getSessionByAppointmentId,
  updateSessionNotes,
  updateSessionStatus,
} from "../../services/telemedicineApi";
import type {
  TelemedicineSession,
  SessionResponse,
} from "../../services/telemedicineApi";

export default function Consultation() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const role = useMemo(() => {
    const roleValue = searchParams.get("role");
    return roleValue === "doctor" ? "doctor" : "patient";
  }, [searchParams]);

  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [noteSavedMessage, setNoteSavedMessage] = useState("");
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

        if (response.status === "scheduled") {
          const updated: SessionResponse = await updateSessionStatus(
            response._id,
            "active"
          );

          setSession(updated.session);
        }
      } catch (error) {
        console.error("Failed to load consultation:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [appointmentId]);

  async function handleSaveNotes() {
    if (!session) return;

    try {
      setSavingNotes(true);

      const updated: SessionResponse = await updateSessionNotes(
        session._id,
        notes
      );

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
    if (!session) return;

    try {
      await updateSessionNotes(session._id, notes);
      await updateSessionStatus(session._id, "completed");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-lg font-medium text-slate-700">
          Loading consultation...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-lg font-medium text-red-600">Session not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-4 md:px-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                Online Consultation
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Appointment ID: {session.appointmentId}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-slate-500">Meeting Timer</p>
              <p className="text-lg font-bold text-blue-600">
                {formatTime(seconds)}
              </p>
            </div>
          </div>

          <div className="aspect-video bg-slate-900 flex items-center justify-center text-white text-center px-4">
            <div>
              <p className="text-2xl font-semibold mb-2">Video Call Area</p>
              <p className="text-sm md:text-base text-slate-300">
                Replace this section later with Jitsi / Zoom / WebRTC video UI
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 p-4 md:p-6">
            <a
              href={session.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition"
            >
              Open Meeting Link
            </a>

            <button
              onClick={handleEndCall}
              className="rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 transition"
            >
              End Call
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-lg p-4 md:p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            Session Details
          </h2>

          <div className="space-y-3 text-sm md:text-base">
            <div>
              <span className="font-semibold text-slate-700">Doctor ID: </span>
              <span className="text-slate-600">{session.doctorId}</span>
            </div>

            <div>
              <span className="font-semibold text-slate-700">Patient ID: </span>
              <span className="text-slate-600">{session.patientId}</span>
            </div>

            <div>
              <span className="font-semibold text-slate-700">Date: </span>
              <span className="text-slate-600">{session.scheduledDate}</span>
            </div>

            <div>
              <span className="font-semibold text-slate-700">Time: </span>
              <span className="text-slate-600">{session.scheduledTime}</span>
            </div>

            <div>
              <span className="font-semibold text-slate-700">Status: </span>
              <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                {session.status}
              </span>
            </div>
          </div>

          {role === "doctor" ? (
            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Doctor Notes
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write doctor notes here..."
                className="min-h-[180px] w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
              />

              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingNotes ? "Saving..." : "Save Notes"}
                </button>

                {noteSavedMessage && (
                  <span className="text-sm font-medium text-emerald-600">
                    {noteSavedMessage}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Patient View
              </h3>
              <p className="text-sm text-slate-600">
                Patients can join the consultation and view session details, but
                cannot edit doctor notes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
