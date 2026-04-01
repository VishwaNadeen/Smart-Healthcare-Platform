import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  createPrescription,
  getPrescriptionsByAppointmentId,
  type TelemedicinePrescription,
} from "../../services/telemedicineApi";
import type { TelemedicineActorRole } from "../../utils/telemedicineAuth";

type PrescriptionDraft = {
  id: string;
  medicineName: string;
  dosage: string;
  instructions: string;
};

const DEFAULT_MEDICINE_COUNT = 4;

type PrescriptionFormProps = {
  role: TelemedicineActorRole;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  readOnly?: boolean;
  consultationNotes?: string;
  onConsultationNotesChange?: (notes: string) => void;
  onSaveConsultationNotes?: () => Promise<void> | void;
};

export type PrescriptionFormHandle = {
  saveAll: () => Promise<void>;
};

function PlusBoldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function MinusBoldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function ChevronRightBoldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

const PrescriptionForm = forwardRef<PrescriptionFormHandle, PrescriptionFormProps>(
function PrescriptionForm({
  role,
  appointmentId,
  doctorId,
  patientId,
  readOnly = false,
  consultationNotes = "",
  onConsultationNotesChange,
  onSaveConsultationNotes,
}: PrescriptionFormProps, ref) {
  const createEmptyDraft = (): PrescriptionDraft => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    medicineName: "",
    dosage: "",
    instructions: "",
  });

  const createDefaultDrafts = (): PrescriptionDraft[] =>
    Array.from({ length: DEFAULT_MEDICINE_COUNT }, () => createEmptyDraft());

  const [prescriptionDrafts, setPrescriptionDrafts] = useState<
    PrescriptionDraft[]
  >(createDefaultDrafts);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [prescriptions, setPrescriptions] = useState<TelemedicinePrescription[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrescriptions() {
      try {
        setLoading(true);
        const response = await getPrescriptionsByAppointmentId(appointmentId);
        setPrescriptions(response.data || []);
      } catch (error) {
        console.error("Failed to load prescriptions:", error);
        setPrescriptions([]);
      } finally {
        setLoading(false);
      }
    }

    if (appointmentId) {
      loadPrescriptions();
    } else {
      setLoading(false);
    }
  }, [appointmentId]);

  const title = "Prescription & Medical Notes";
  const canCreatePrescription = role === "doctor" && !readOnly;
  const canEditConsultationNotes =
    canCreatePrescription &&
    typeof onConsultationNotesChange === "function" &&
    typeof onSaveConsultationNotes === "function";
  const filledPrescriptionDrafts = prescriptionDrafts.filter(
    (draft) =>
      draft.medicineName.trim() ||
      draft.dosage.trim() ||
      draft.instructions.trim()
  );
  const hasIncompletePrescriptionDraft = prescriptionDrafts.some((draft) => {
    const hasAnyField =
      draft.medicineName.trim() ||
      draft.dosage.trim() ||
      draft.instructions.trim();

    return (
      Boolean(hasAnyField) &&
      (!draft.medicineName.trim() ||
        !draft.dosage.trim() ||
        !draft.instructions.trim())
    );
  });

  function updatePrescriptionDraft(
    draftId: string,
    field: keyof Omit<PrescriptionDraft, "id">,
    value: string
  ) {
    setPrescriptionDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId ? { ...draft, [field]: value } : draft
      )
    );
  }

  function addPrescriptionDraft() {
    const nextDraft = createEmptyDraft();
    setPrescriptionDrafts((current) => [...current, nextDraft]);
    setExpandedDraftId(null);
  }

  function removePrescriptionDraft(draftId: string) {
    setPrescriptionDrafts((current) => {
      if (current.length === 1) {
        const nextDrafts = createDefaultDrafts();
        setExpandedDraftId(null);
        return nextDrafts;
      }

      const nextDrafts = current.filter((draft) => draft.id !== draftId);
      setExpandedDraftId(null);
      return nextDrafts;
    });
  }

  async function handleSaveAll() {
    if (!canCreatePrescription) {
      return;
    }

    if (hasIncompletePrescriptionDraft) {
      alert("Please fill all prescription fields");
      throw new Error("Please fill all prescription fields");
    }

    try {
      setSaving(true);

      let savedNotes = false;
      let savedPrescriptionCount = 0;

      if (canEditConsultationNotes) {
        await onSaveConsultationNotes();
        savedNotes = true;
      }

      if (filledPrescriptionDrafts.length > 0) {
        const createdPrescriptions: TelemedicinePrescription[] = [];

        for (const draft of filledPrescriptionDrafts) {
          const response = await createPrescription({
            appointmentId,
            doctorId,
            patientId,
            medicineName: draft.medicineName.trim(),
            dosage: draft.dosage.trim(),
            instructions: draft.instructions.trim(),
          });

          createdPrescriptions.push(response.data);
        }

        setPrescriptions((prev) => [
          ...createdPrescriptions.slice().reverse(),
          ...prev,
        ]);
        const nextDrafts = createDefaultDrafts();
        setPrescriptionDrafts(nextDrafts);
        setExpandedDraftId(null);
        savedPrescriptionCount = createdPrescriptions.length;
      }

      setSavedMessage(
        savedNotes && savedPrescriptionCount > 0
          ? `Notes and ${savedPrescriptionCount} prescription${
              savedPrescriptionCount > 1 ? "s" : ""
            } saved successfully`
          : savedPrescriptionCount > 0
            ? `${savedPrescriptionCount} prescription${
                savedPrescriptionCount > 1 ? "s" : ""
              } saved successfully`
            : "Notes saved successfully"
      );

      setTimeout(() => {
        setSavedMessage("");
      }, 2000);
    } catch (error) {
      console.error("Failed to save medical details:", error);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      saveAll: handleSaveAll,
    }),
    [handleSaveAll]
  );

  if (!canCreatePrescription) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">
            Consultation Notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
            {consultationNotes.trim()
              ? consultationNotes
              : "No consultation notes available."}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading prescriptions...</p>
        ) : prescriptions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">
              No prescription has been shared for this consultation yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((prescription) => (
              <div
                key={prescription._id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="font-semibold text-slate-800">
                  {prescription.medicineName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Dosage: {prescription.dosage}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                  Instructions: {prescription.instructions}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div>
        <h2 className="text-center text-xl font-bold text-slate-800">
          {title}
        </h2>
      </div>

      <div className="mt-6">
        <div>
          <textarea
            value={consultationNotes}
            onChange={(e) => onConsultationNotesChange?.(e.target.value)}
            className="h-40 w-full resize-none rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
            placeholder="Write consultation notes here"
          />
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-4 border-t border-slate-200 pt-4">
          {prescriptionDrafts.map((draft, index) => (
            <div
              key={draft.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedDraftId((current) =>
                      current === draft.id ? null : draft.id
                    )
                  }
                  className="min-w-0 flex-1 text-left"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      {draft.medicineName.trim()
                        ? draft.medicineName.trim()
                        : `Medicine ${index + 1}`}
                    </h3>
                  </div>
                </button>
                <div className="flex items-center gap-2 text-slate-400">
                  {index === prescriptionDrafts.length - 1 ? (
                    <button
                      type="button"
                      onClick={addPrescriptionDraft}
                      className="inline-flex h-7 w-7 items-center justify-center text-blue-700 transition hover:text-blue-800"
                      aria-label="Add medicine"
                      title="Add medicine"
                    >
                      <PlusBoldIcon />
                    </button>
                  ) : null}
                  {prescriptionDrafts.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removePrescriptionDraft(draft.id)}
                      className="inline-flex h-7 w-7 items-center justify-center text-rose-600 transition hover:text-rose-700"
                      aria-label="Remove medicine"
                      title="Remove medicine"
                    >
                      <MinusBoldIcon />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedDraftId((current) =>
                        current === draft.id ? null : draft.id
                      )
                    }
                    className={`inline-flex h-7 w-7 items-center justify-center transition-transform duration-200 hover:text-slate-600 ${
                      expandedDraftId === draft.id ? "rotate-90" : ""
                    }`}
                    aria-label={
                      expandedDraftId === draft.id
                        ? "Collapse medicine"
                        : "Expand medicine"
                    }
                    title={
                      expandedDraftId === draft.id
                        ? "Collapse medicine"
                        : "Expand medicine"
                    }
                  >
                    <ChevronRightBoldIcon />
                  </button>
                </div>
              </div>

              {expandedDraftId === draft.id ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Medicine Name
                    </label>
                    <input
                      type="text"
                      value={draft.medicineName}
                      onChange={(e) =>
                        updatePrescriptionDraft(
                          draft.id,
                          "medicineName",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
                      placeholder="Enter medicine name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Dosage
                    </label>
                    <input
                      type="text"
                      value={draft.dosage}
                      onChange={(e) =>
                        updatePrescriptionDraft(
                          draft.id,
                          "dosage",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
                      placeholder="Enter dosage"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Instructions
                    </label>
                    <textarea
                      value={draft.instructions}
                      onChange={(e) =>
                        updatePrescriptionDraft(
                          draft.id,
                          "instructions",
                          e.target.value
                        )
                      }
                      className="h-32 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500"
                      placeholder="Enter instructions"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {savedMessage ? (
          <p className="text-sm font-medium text-emerald-600">{savedMessage}</p>
        ) : null}
      </div>

    </div>
  );
});

export default PrescriptionForm;

