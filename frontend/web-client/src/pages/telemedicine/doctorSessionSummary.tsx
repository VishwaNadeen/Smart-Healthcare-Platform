import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import FullScreenPageLoading from "../../components/common/FullScreenPageLoading";
import PrescriptionForm from "../../components/telemedicine/PrescriptionForm";
import type { PrescriptionFormHandle } from "../../components/telemedicine/PrescriptionForm";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import {
  getSessionByAppointmentId,
  type TelemedicineSession,
  updateConsultationNotes,
} from "../../services/telemedicineApi";
import {
  canAccessTelemedicineSession,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";

function getStringValue(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getSummaryValue(session: TelemedicineSession, key: string): string {
  const source = session as TelemedicineSession & Record<string, unknown>;
  return getStringValue(source[key]);
}

function formatLabelValue(value: string | undefined): string {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "Not available";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function DetailCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-slate-50 p-5 shadow-[0_10px_24px_rgba(59,130,246,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-3 break-words text-sm font-medium ${valueClassName || "text-slate-800"}`}>
        {value || "Not available"}
      </p>
    </div>
  );
}

export default function DoctorSessionSummary() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [isSavingEditModal, setIsSavingEditModal] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [matchedPanelHeight, setMatchedPanelHeight] = useState<number | null>(null);
  const [readOnlyNotesHeight, setReadOnlyNotesHeight] = useState<number | null>(null);
  const detailsPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelHeaderRef = useRef<HTMLDivElement | null>(null);
  const editFormRef = useRef<PrescriptionFormHandle | null>(null);
  const auth = getStoredTelemedicineAuth();
  const role = auth.actorRole;

  useEffect(() => {
    async function loadSession() {
      if (!appointmentId) {
        setError("Appointment ID not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getSessionByAppointmentId(appointmentId);
        setSession(data);
      } catch (err) {
        console.error("Failed to load doctor session summary:", err);
        setError("Failed to load doctor session summary.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [appointmentId]);

  useEffect(() => {
    setEditNotes(session?.notes || "");
  }, [session?.notes]);

  useEffect(() => {
    function syncPanelHeight() {
      if (typeof window === "undefined" || window.innerWidth < 1024) {
        setMatchedPanelHeight(null);
        setReadOnlyNotesHeight(null);
        return;
      }

      const nextHeight = detailsPanelRef.current?.getBoundingClientRect().height ?? 0;
      setMatchedPanelHeight(nextHeight > 0 ? Math.ceil(nextHeight) : null);

      const rightPanelTop = rightPanelRef.current?.getBoundingClientRect().top ?? 0;
      const headerBottom = rightPanelHeaderRef.current?.getBoundingClientRect().bottom ?? 0;
      const headerGap = 16;
      const nextNotesHeight = Math.floor(rightPanelTop + nextHeight / 2 - headerBottom - headerGap);

      setReadOnlyNotesHeight(nextNotesHeight > 102 ? nextNotesHeight : 102);
    }

    const frameId = window.requestAnimationFrame(syncPanelHeight);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && detailsPanelRef.current
        ? new ResizeObserver(() => syncPanelHeight())
        : null;

    if (detailsPanelRef.current && resizeObserver) {
      resizeObserver.observe(detailsPanelRef.current);
    }

    window.addEventListener("resize", syncPanelHeight);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncPanelHeight);
    };
  }, [session]);

  if (!auth.userId || role !== "doctor") {
    return (
      <TelemedicineAccessNotice
        title="Doctor summary needs login data"
        description="This page is only available for doctor accounts. Please sign in again."
        actionLabel="Go to Login"
      />
    );
  }

  if (loading) {
    return <FullScreenPageLoading message="Loading session summary..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-red-50 p-8 text-center text-red-600 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 text-center text-gray-600 shadow-sm">
          Session not found.
        </div>
      </div>
    );
  }

  if (!canAccessTelemedicineSession(auth, session)) {
    return (
      <TelemedicineAccessNotice
        title="Summary access denied"
        description="This appointment belongs to a different doctor account."
        actionLabel="Doctor Sessions"
        actionTo="/doctor-sessions"
      />
    );
  }

  const patientName =
    session.patient?.fullName ||
    session.patient?.name ||
    session.patientName ||
    "Patient name not available";

  const duration =
    getSummaryValue(session, "duration") ||
    getSummaryValue(session, "durationMinutes") ||
    "Not available";
  const sessionStatus = formatLabelValue(session.status);
  const sessionStatusClassName =
    session.status === "completed" ? "text-emerald-600" : "text-slate-800";

  async function reloadSession() {
    if (!appointmentId) {
      return;
    }

    const data = await getSessionByAppointmentId(appointmentId);
    setSession(data);
    setEditNotes(data.notes || "");
  }

  async function handleSaveEditModalNotes() {
    if (!appointmentId) {
      return;
    }

    const updated = await updateConsultationNotes({
      appointmentId,
      notes: editNotes,
    });

    setSession(updated.data);
    setEditNotes(updated.data.notes || "");
  }

  async function handleSaveEditModal() {
    if (!editFormRef.current) {
      return;
    }

    try {
      setIsSavingEditModal(true);
      await editFormRef.current.saveAll();
      await reloadSession();
      setIsEditModalOpen(false);
      setFormVersion((current) => current + 1);
    } catch (err) {
      console.error("Failed to save doctor summary edits:", err);
    } finally {
      setIsSavingEditModal(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className={`mx-auto max-w-6xl space-y-6 transition ${isEditModalOpen ? "blur-sm" : ""}`}>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center justify-center gap-5 text-center">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Session Summary
              </div>

              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Consultation Completed
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Review notes and prescription summary for this appointment.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div
            ref={detailsPanelRef}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Appointment Details
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailCard label="Patient Name" value={patientName} />
              <DetailCard label="Date" value={session.scheduledDate || "Not available"} />
              <DetailCard label="Time" value={session.scheduledTime || "Not available"} />
              <DetailCard label="Room Name" value={session.roomName || "Not available"} />
              <DetailCard
                label="Session Status"
                value={sessionStatus}
                valueClassName={sessionStatusClassName}
              />
              <DetailCard label="Duration" value={duration} />
            </div>
          </div>

          <div
            ref={rightPanelRef}
            className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            style={matchedPanelHeight ? { height: matchedPanelHeight } : undefined}
          >
            <div ref={rightPanelHeaderRef} className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Prescription & Medical Notes
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditNotes(session.notes || "");
                  setFormVersion((current) => current + 1);
                  setIsEditModalOpen(true);
                }}
                className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
              >
                Edit
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <PrescriptionForm
                key={`readonly-${formVersion}`}
                role={role}
                appointmentId={session.appointmentId}
                doctorId={session.doctorId}
                patientId={session.patientId}
                consultationNotes={session.notes || ""}
                readOnly
                plainReadOnly
                hideTitle
                readOnlyNotesHeight={readOnlyNotesHeight}
              />
            </div>
          </div>
        </div>
      </div>

      {isEditModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:p-6">
            <div className="max-h-[80vh] overflow-y-auto pr-1">
              <PrescriptionForm
                key={`edit-${formVersion}`}
                ref={editFormRef}
                role={role}
                appointmentId={session.appointmentId}
                doctorId={session.doctorId}
                patientId={session.patientId}
                loadExistingIntoEditor
                consultationNotes={editNotes}
                onConsultationNotesChange={setEditNotes}
                onSaveConsultationNotes={handleSaveEditModalNotes}
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isSavingEditModal) {
                    return;
                  }
                  setIsEditModalOpen(false);
                  setEditNotes(session.notes || "");
                }}
                disabled={isSavingEditModal}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSaveEditModal();
                }}
                disabled={isSavingEditModal}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingEditModal ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
