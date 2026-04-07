import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  createPrescription,
  getPrescriptionsByAppointmentId,
  type TelemedicinePrescription,
  updateConsultationNotes,
  updatePrescription,
} from "../../services/telemedicineApi";
import type { TelemedicineActorRole } from "../../utils/telemedicineAuth";

type Draft = {
  id: string;
  prescriptionId?: string;
  medicineName: string;
  dosage: string;
  instructions: string;
};
type SummaryDraft = { medicineName: string; dosage: string; instructions: string };

const emptySummaryDraft = (): SummaryDraft => ({ medicineName: "", dosage: "", instructions: "" });
const newDraft = (): Draft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  medicineName: "",
  dosage: "",
  instructions: "",
});

type Props = {
  role: TelemedicineActorRole;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  readOnly?: boolean;
  plainReadOnly?: boolean;
  summaryEditable?: boolean;
  hideTitle?: boolean;
  loadExistingIntoEditor?: boolean;
  autoRefreshWhenEmpty?: boolean;
  readOnlyNotesHeight?: number | null;
  consultationNotes?: string;
  onConsultationNotesChange?: (notes: string) => void;
  onSaveConsultationNotes?: () => Promise<void> | void;
};

export type PrescriptionFormHandle = { saveAll: () => Promise<void> };

function Icon({ children }: { children: ReactNode }) {
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
      {children}
    </svg>
  );
}

const PrescriptionForm = forwardRef<PrescriptionFormHandle, Props>(function PrescriptionForm(
  {
    role,
    appointmentId,
    doctorId,
    patientId,
    readOnly = false,
    plainReadOnly = false,
    summaryEditable = false,
    hideTitle = false,
    loadExistingIntoEditor = false,
    autoRefreshWhenEmpty = false,
    readOnlyNotesHeight = null,
    consultationNotes = "",
    onConsultationNotesChange,
    onSaveConsultationNotes,
  },
  ref
) {
  const [prescriptionDrafts, setPrescriptionDrafts] = useState<Draft[]>(
    Array.from({ length: 4 }, () => newDraft())
  );
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [prescriptions, setPrescriptions] = useState<TelemedicinePrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesValue, setNotesValue] = useState(consultationNotes);
  const [notesDraft, setNotesDraft] = useState(consultationNotes);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [summarySaving, setSummarySaving] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [isAddingPrescription, setIsAddingPrescription] = useState(false);
  const [newPrescriptionDraft, setNewPrescriptionDraft] = useState<SummaryDraft>(emptySummaryDraft);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState("");
  const [editingPrescriptionDraft, setEditingPrescriptionDraft] = useState<SummaryDraft>(emptySummaryDraft);
  const [activePrescriptionIndex, setActivePrescriptionIndex] = useState(0);

  const canCreatePrescription = role === "doctor" && !readOnly;
  const canEditConsultationNotes =
    canCreatePrescription &&
    typeof onConsultationNotesChange === "function" &&
    typeof onSaveConsultationNotes === "function";
  const canEditSummary = summaryEditable && role === "doctor";
  const title = "Prescription & Medical Notes";

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;

    async function loadPrescriptions() {
      try {
        setLoading(true);
        const response = await getPrescriptionsByAppointmentId(appointmentId);
        const nextPrescriptions = response.data || [];

        if (!isMounted) {
          return [] as TelemedicinePrescription[];
        }

        setPrescriptions(nextPrescriptions);

        if (!readOnly && loadExistingIntoEditor) {
          if (nextPrescriptions.length > 0) {
            setPrescriptionDrafts(
              nextPrescriptions.map((prescription) => ({
                id: prescription._id,
                prescriptionId: prescription._id,
                medicineName: prescription.medicineName,
                dosage: prescription.dosage,
                instructions: prescription.instructions,
              }))
            );
          } else {
            setPrescriptionDrafts(Array.from({ length: 4 }, () => newDraft()));
          }
          setExpandedDraftId(null);
        }

        if (nextPrescriptions.length > 0 && intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }

        return nextPrescriptions;
      } catch (error) {
        console.error("Failed to load prescriptions:", error);
        if (isMounted) {
          setPrescriptions([]);
        }
        return [] as TelemedicinePrescription[];
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (appointmentId) {
      void loadPrescriptions();

      if (readOnly && autoRefreshWhenEmpty && role === "patient") {
        intervalId = window.setInterval(() => {
          void loadPrescriptions();
        }, 5000);
      }
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [appointmentId, autoRefreshWhenEmpty, loadExistingIntoEditor, readOnly, role]);

  useEffect(() => {
    setNotesValue(consultationNotes);
    setNotesDraft(consultationNotes);
  }, [consultationNotes]);

  useEffect(() => {
    setActivePrescriptionIndex((current) => {
      if (prescriptions.length === 0) {
        return 0;
      }

      return Math.min(current, prescriptions.length - 1);
    });
  }, [prescriptions.length]);

  const showPatientEmptyState =
    readOnly &&
    role === "patient" &&
    !notesValue.trim() &&
    prescriptions.length === 0;

  const showPatientPrescriptionLoading =
    readOnly &&
    role === "patient" &&
    loading &&
    !showPatientEmptyState;

  const showDoctorPrescriptionLoading =
    readOnly &&
    role === "doctor" &&
    loading;

  const showPrescriptionLoadingAnimation =
    showPatientPrescriptionLoading || showDoctorPrescriptionLoading;
  const showEditorPrescriptionLoading =
    !readOnly && loadExistingIntoEditor && loading;
  function flash(message: string) {
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(""), 2000);
  }

  function updateDraft(id: string, field: keyof Omit<Draft, "id">, value: string) {
    setPrescriptionDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, [field]: value } : draft))
    );
  }

  function toggleDraftExpansion(id: string) {
    setExpandedDraftId((current) => (current === id ? null : id));
  }

    function updateSummaryDraft(
      setter: Dispatch<SetStateAction<SummaryDraft>>,
    field: keyof SummaryDraft,
    value: string
  ) {
    setter((current) => ({ ...current, [field]: value }));
  }

  function validSummaryDraft(draft: SummaryDraft) {
    return draft.medicineName.trim() && draft.dosage.trim() && draft.instructions.trim();
  }

  async function saveSummaryNotes() {
    try {
      setSummarySaving(true);
      setSummaryError("");
      await updateConsultationNotes({ appointmentId, notes: notesDraft });
      setNotesValue(notesDraft);
      setIsEditingNotes(false);
      flash("Notes saved successfully");
    } catch (error) {
      console.error("Failed to update notes:", error);
      setSummaryError(error instanceof Error ? error.message : "Failed to save notes");
    } finally {
      setSummarySaving(false);
    }
  }

  async function saveNewPrescription() {
    if (!validSummaryDraft(newPrescriptionDraft)) {
      setSummaryError("Please fill all prescription fields");
      return;
    }
    try {
      setSummarySaving(true);
      setSummaryError("");
      const response = await createPrescription({
        appointmentId,
        doctorId,
        patientId,
        medicineName: newPrescriptionDraft.medicineName.trim(),
        dosage: newPrescriptionDraft.dosage.trim(),
        instructions: newPrescriptionDraft.instructions.trim(),
      });
      setPrescriptions((current) => [response.data, ...current]);
      setNewPrescriptionDraft(emptySummaryDraft());
      setIsAddingPrescription(false);
      flash("Prescription saved successfully");
    } catch (error) {
      console.error("Failed to save prescription:", error);
      setSummaryError(error instanceof Error ? error.message : "Failed to save prescription");
    } finally {
      setSummarySaving(false);
    }
  }

  async function saveEditedPrescription() {
    if (!editingPrescriptionId || !validSummaryDraft(editingPrescriptionDraft)) {
      setSummaryError("Please fill all prescription fields");
      return;
    }
    try {
      setSummarySaving(true);
      setSummaryError("");
      const response = await updatePrescription({
        prescriptionId: editingPrescriptionId,
        medicineName: editingPrescriptionDraft.medicineName.trim(),
        dosage: editingPrescriptionDraft.dosage.trim(),
        instructions: editingPrescriptionDraft.instructions.trim(),
      });
      setPrescriptions((current) =>
        current.map((item) => (item._id === editingPrescriptionId ? response.data : item))
      );
      setEditingPrescriptionId("");
      setEditingPrescriptionDraft(emptySummaryDraft());
      flash("Prescription updated successfully");
    } catch (error) {
      console.error("Failed to update prescription:", error);
      setSummaryError(error instanceof Error ? error.message : "Failed to update prescription");
    } finally {
      setSummarySaving(false);
    }
  }

  async function handleSaveAll() {
    if (!canCreatePrescription) return;
    const incomplete = prescriptionDrafts.some((draft) => {
      const any = draft.medicineName.trim() || draft.dosage.trim() || draft.instructions.trim();
      return Boolean(any) && (!draft.medicineName.trim() || !draft.dosage.trim() || !draft.instructions.trim());
    });
    if (incomplete) {
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
      const filled = prescriptionDrafts.filter(
        (draft) => draft.medicineName.trim() || draft.dosage.trim() || draft.instructions.trim()
      );
      if (filled.length > 0) {
        const saved: TelemedicinePrescription[] = [];
        for (const draft of filled) {
          const response = draft.prescriptionId
            ? await updatePrescription({
                prescriptionId: draft.prescriptionId,
                medicineName: draft.medicineName.trim(),
                dosage: draft.dosage.trim(),
                instructions: draft.instructions.trim(),
              })
            : await createPrescription({
                appointmentId,
                doctorId,
                patientId,
                medicineName: draft.medicineName.trim(),
                dosage: draft.dosage.trim(),
                instructions: draft.instructions.trim(),
              });
          saved.push(response.data);
        }
        setPrescriptions(saved.slice().reverse());
        setPrescriptionDrafts(
          loadExistingIntoEditor
            ? saved
                .slice()
                .reverse()
                .map((prescription) => ({
                  id: prescription._id,
                  prescriptionId: prescription._id,
                  medicineName: prescription.medicineName,
                  dosage: prescription.dosage,
                  instructions: prescription.instructions,
                }))
            : Array.from({ length: 4 }, () => newDraft())
        );
        setExpandedDraftId(null);
        savedPrescriptionCount = saved.length;
      }
      flash(
        savedNotes && savedPrescriptionCount > 0
          ? `Notes and ${savedPrescriptionCount} prescription${savedPrescriptionCount > 1 ? "s" : ""} saved successfully`
          : savedPrescriptionCount > 0
            ? `${savedPrescriptionCount} prescription${savedPrescriptionCount > 1 ? "s" : ""} saved successfully`
            : "Notes saved successfully"
      );
    } catch (error) {
      console.error("Failed to save medical details:", error);
      throw error instanceof Error ? error : new Error("Failed to save medical details");
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({ saveAll: handleSaveAll }), [handleSaveAll]);

  if (!canCreatePrescription) {
    const boxClassName =
      "rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm";
    const itemClassName = plainReadOnly
      ? "p-1"
      : "rounded-xl border border-slate-200 bg-slate-50 p-4";

    if (showPrescriptionLoadingAnimation) {
      return (
        <div className="flex h-full min-h-0 items-center justify-center overflow-hidden px-4 py-6">
          <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center text-center">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
              aria-label="Prescription loading indicator"
            />
          </div>
        </div>
      );
    }

    if (showPatientEmptyState) {
      return (
        <div className="flex h-full min-h-0 items-center justify-center overflow-hidden px-4 py-6">
          <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-52 w-full max-w-sm items-center justify-center rounded-[28px] bg-gradient-to-br from-blue-50 via-white to-slate-100 shadow-inner sm:h-60">
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-600 shadow-sm">
                  RX
                </div>
                <p className="mt-4 px-4 text-sm font-medium text-slate-500">
                  Prescription details are not ready yet.
                </p>
              </div>
            </div>

            <p className="max-w-md text-base font-semibold leading-8 text-slate-800 sm:text-lg">
              Prescription and consultation notes are not ready yet.
            </p>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-600 sm:text-base">
              The doctor has not saved the medical notes or prescription for this
              appointment yet. This section will update automatically once the
              consultation details are shared.
            </p>
          </div>
        </div>
      );
    }

      return (
        <div className="flex h-full min-h-0 flex-col">
          <div className={`min-h-0 ${plainReadOnly ? "flex flex-1 flex-col gap-4" : "space-y-4"}`}>
          {!hideTitle ? (
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          ) : null}
        <div
          className={
            plainReadOnly
              ? `${boxClassName} h-[102px] overflow-hidden`
              : boxClassName
          }
          style={
            plainReadOnly && readOnlyNotesHeight
              ? { height: `${readOnlyNotesHeight}px` }
              : undefined
          }
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">Consultation Notes</p>
            {canEditSummary ? (
              <button
                type="button"
                onClick={() => {
                  setSummaryError("");
                  if (isEditingNotes) setNotesDraft(notesValue);
                  setIsEditingNotes((current) => !current);
                }}
                className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
              >
                {isEditingNotes ? "Cancel" : "Edit"}
              </button>
            ) : null}
          </div>
          {canEditSummary && isEditingNotes ? (
            <div className="mt-3 space-y-3">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                className="h-32 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500"
                placeholder="Write consultation notes here"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    void saveSummaryNotes();
                  }}
                  disabled={summarySaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save Notes
                </button>
              </div>
            </div>
          ) : (
            <p
              className={`mt-2 text-sm text-slate-600 ${
                plainReadOnly ? "max-h-10 overflow-hidden break-words" : "whitespace-pre-wrap"
              }`}
            >
              {notesValue.trim() ? notesValue : "No consultation notes available."}
            </p>
          )}
        </div>

        <div
          className={
            plainReadOnly ? `${boxClassName} flex min-h-0 flex-1 flex-col` : boxClassName
          }
        >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Prescriptions</p>
              {canEditSummary ? (
                <button
                  type="button"
                  onClick={() => {
                    setSummaryError("");
                    setEditingPrescriptionId("");
                    setEditingPrescriptionDraft(emptySummaryDraft());
                    setIsAddingPrescription((current) => !current);
                  }}
                  className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  {isAddingPrescription ? "Cancel" : "Add"}
                </button>
              ) : null}
            </div>

            {canEditSummary && isAddingPrescription ? (
              <div className="mt-3 space-y-3 rounded-lg bg-white/70 p-3">
                <input
                  type="text"
                  value={newPrescriptionDraft.medicineName}
                  onChange={(e) =>
                    updateSummaryDraft(setNewPrescriptionDraft, "medicineName", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Medicine name"
                />
                <input
                  type="text"
                  value={newPrescriptionDraft.dosage}
                  onChange={(e) =>
                    updateSummaryDraft(setNewPrescriptionDraft, "dosage", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Dosage"
                />
                <textarea
                  value={newPrescriptionDraft.instructions}
                  onChange={(e) =>
                    updateSummaryDraft(setNewPrescriptionDraft, "instructions", e.target.value)
                  }
                  className="h-28 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500"
                  placeholder="Instructions"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      void saveNewPrescription();
                    }}
                    disabled={summarySaving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save Prescription
                  </button>
                </div>
              </div>
            ) : null}

          {prescriptions.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                No prescription has been shared for this consultation yet.
              </p>
            ) : plainReadOnly ? (
              <div className="mt-3 flex flex-1 flex-col justify-between gap-4 pb-4">
                <div
                  className={`${itemClassName} min-h-[68px]`}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Medicine
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                        {prescriptions[activePrescriptionIndex]?.medicineName}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Dosage
                      </p>
                      <p className="mt-1 break-words text-sm text-slate-600">
                        {prescriptions[activePrescriptionIndex]?.dosage}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Instructions
                      </p>
                      <p className="mt-1 break-words text-sm text-slate-600">
                        {prescriptions[activePrescriptionIndex]?.instructions}
                      </p>
                    </div>
                  </div>
                </div>

                {prescriptions.length > 1 ? (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setActivePrescriptionIndex((current) => Math.max(current - 1, 0))
                      }
                      disabled={activePrescriptionIndex === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous prescription"
                    >
                      <Icon>
                        <path d="m15 18-6-6 6-6" />
                      </Icon>
                    </button>

                    <p className="text-xs font-semibold text-slate-500">
                      {activePrescriptionIndex + 1} / {prescriptions.length}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setActivePrescriptionIndex((current) =>
                          Math.min(current + 1, prescriptions.length - 1)
                        )
                      }
                      disabled={activePrescriptionIndex === prescriptions.length - 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next prescription"
                    >
                      <Icon>
                        <path d="m9 18 6-6-6-6" />
                      </Icon>
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 max-h-56 space-y-3 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {prescriptions.map((prescription) => (
                  <div key={prescription._id} className={itemClassName}>
                    {canEditSummary && editingPrescriptionId === prescription._id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingPrescriptionDraft.medicineName}
                          onChange={(e) =>
                            updateSummaryDraft(
                              setEditingPrescriptionDraft,
                              "medicineName",
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
                          placeholder="Medicine name"
                        />
                        <input
                          type="text"
                          value={editingPrescriptionDraft.dosage}
                          onChange={(e) =>
                            updateSummaryDraft(
                              setEditingPrescriptionDraft,
                              "dosage",
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
                          placeholder="Dosage"
                        />
                        <textarea
                          value={editingPrescriptionDraft.instructions}
                          onChange={(e) =>
                            updateSummaryDraft(
                              setEditingPrescriptionDraft,
                              "instructions",
                              e.target.value
                            )
                          }
                          className="h-28 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500"
                          placeholder="Instructions"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPrescriptionId("");
                              setEditingPrescriptionDraft(emptySummaryDraft());
                            }}
                            disabled={summarySaving}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void saveEditedPrescription();
                            }}
                            disabled={summarySaving}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-slate-800">
                            {prescription.medicineName}
                          </p>
                          {canEditSummary ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSummaryError("");
                                setIsAddingPrescription(false);
                                setEditingPrescriptionId(prescription._id);
                                setEditingPrescriptionDraft({
                                  medicineName: prescription.medicineName,
                                  dosage: prescription.dosage,
                                  instructions: prescription.instructions,
                                });
                              }}
                              className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                            >
                              Edit
                            </button>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          Dosage: {prescription.dosage}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                          Instructions: {prescription.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        {summaryError ? (
          <p className="text-sm font-medium text-rose-600">{summaryError}</p>
        ) : null}
        {savedMessage ? (
          <p className="text-sm font-medium text-emerald-600">{savedMessage}</p>
        ) : null}
          </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!hideTitle ? (
        <div>
          <h2 className="text-center text-xl font-bold text-slate-800">{title}</h2>
        </div>
      ) : null}
      <div className="mt-6">
        <textarea
          value={consultationNotes}
          onChange={(e) => onConsultationNotesChange?.(e.target.value)}
          className="h-40 w-full resize-none rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
          placeholder="Write consultation notes here"
        />
      </div>
      <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-4 border-t border-slate-200 pt-4">
          {showEditorPrescriptionLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              <div className="flex min-h-[4.5rem] flex-col items-center justify-center gap-3">
                <div
                  className="h-14 w-14 animate-spin rounded-full border-[3px] border-slate-300 border-t-blue-600"
                  aria-label="Loading saved prescriptions indicator"
                />
                <p>Loading saved prescriptions...</p>
              </div>
            </div>
          ) : (
            <>
              {prescriptionDrafts.map((draft, index) => {
                const isExpanded = expandedDraftId === draft.id;
                const draftLabel = draft.medicineName.trim()
                  ? draft.medicineName.trim()
                  : `Medicine ${index + 1}`;

                return (
                <div
                  key={draft.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-slate-100/80"
                >
                  <div className="flex min-h-[44px] items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDraftExpansion(draft.id)}
                      aria-expanded={isExpanded}
                      aria-label={
                        isExpanded ? `Minimize ${draftLabel}` : `Expand ${draftLabel}`
                      }
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <h3 className="text-sm font-semibold text-slate-800">
                        {draftLabel}
                      </h3>
                    </button>

                    <div className="flex items-center gap-2 text-slate-400">
                      {index === prescriptionDrafts.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPrescriptionDrafts((current) => [...current, newDraft()]);
                          }}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center text-blue-700 transition hover:text-blue-800"
                          aria-label="Add medicine"
                          title="Add medicine"
                        >
                          <Icon>
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                          </Icon>
                        </button>
                      ) : null}

                      {prescriptionDrafts.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPrescriptionDrafts((current) =>
                              current.length === 1
                                ? Array.from({ length: 4 }, () => newDraft())
                                : current.filter((item) => item.id !== draft.id)
                            );
                          }}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center text-rose-600 transition hover:text-rose-700"
                          aria-label="Remove medicine"
                          title="Remove medicine"
                        >
                          <Icon>
                            <path d="M5 12h14" />
                          </Icon>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => {
                          toggleDraftExpansion(draft.id);
                        }}
                        className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center transition-transform duration-200 hover:text-slate-600 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        aria-label={
                          isExpanded ? "Minimize medicine" : "Expand medicine"
                        }
                        title={isExpanded ? "Minimize medicine" : "Expand medicine"}
                      >
                        <Icon>
                          <path d="m9 6 6 6-6 6" />
                        </Icon>
                      </button>
                    </div>
                  </div>
                  {isExpanded ? (
                    <div
                      className="mt-4 space-y-4"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Medicine Name</label>
                        <input
                          type="text"
                          value={draft.medicineName}
                          onChange={(e) => updateDraft(draft.id, "medicineName", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
                          placeholder="Enter medicine name"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Dosage</label>
                        <input
                          type="text"
                          value={draft.dosage}
                          onChange={(e) => updateDraft(draft.id, "dosage", e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
                          placeholder="Enter dosage"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Instructions</label>
                        <textarea
                          value={draft.instructions}
                          onChange={(e) => updateDraft(draft.id, "instructions", e.target.value)}
                          className="h-32 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500"
                          placeholder="Enter instructions"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )})}
            </>
          )}
        </div>
        {savedMessage ? <p className="text-sm font-medium text-emerald-600">{savedMessage}</p> : null}
      </div>
    </div>
  );
});

export default PrescriptionForm;
