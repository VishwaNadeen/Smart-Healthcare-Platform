import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ChatPanel from "../../components/telemedicine/ChatPanel";
import FileUploadPanel from "../../components/telemedicine/FileUploadPanel";
import PrescriptionForm from "../../components/telemedicine/PrescriptionForm";
import {
  getSessionByAppointmentId,
  updateSessionNotes,
  updateSessionStatus,
} from "../../services/telemedicineApi";
import type { TelemedicineSession } from "../../services/telemedicineApi";

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
          const updated = await updateSessionStatus(appointmentId, "active");
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
    if (!appointmentId || !session) return;

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
    if (!appointmentId || !session) return;

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

            <div className="flex aspect-video items-center justify-center bg-slate-900 text-center text-white">
              Video Call Area
            </div>

            <div className="flex flex-wrap items-center gap-3 p-4 md:p-6">
              <a
                href={session.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                Open Meeting Link
              </a>

              <button
                onClick={handleEndCall}
                className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
              >
                End Call
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-lg md:p-6">
            <h2 className="mb-4 text-xl font-bold text-slate-800">
              Consultation Chat
            </h2>
            {appointmentId && <ChatPanel role={role} appointmentId={appointmentId} />}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-lg md:p-6">
            <h2 className="mb-4 text-xl font-bold text-slate-800">
              Upload Medical Files
            </h2>
            {appointmentId && <FileUploadPanel appointmentId={appointmentId} role={role} />}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-lg md:p-6">
            <h2 className="mb-4 text-xl font-bold text-slate-800">
              Prescription
            </h2>
            {appointmentId && session && (
              <PrescriptionForm
                role={role}
                appointmentId={appointmentId}
                doctorId={session.doctorId}
                patientId={session.patientId}
              />
            )}
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

          {role === "doctor" ? (
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

                {noteSavedMessage && (
                  <span className="text-sm text-emerald-600">
                    {noteSavedMessage}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              Patients cannot edit doctor notes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}