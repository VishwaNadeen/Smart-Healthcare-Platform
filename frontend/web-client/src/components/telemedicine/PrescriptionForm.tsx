import { useEffect, useState } from "react";
import {
  createPrescription,
  getPrescriptionsByAppointmentId,
  type TelemedicinePrescription,
} from "../../services/telemedicineApi";
import type { TelemedicineActorRole } from "../../utils/telemedicineAuth";

type PrescriptionFormProps = {
  role: TelemedicineActorRole;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  readOnly?: boolean;
};

export default function PrescriptionForm({
  role,
  appointmentId,
  doctorId,
  patientId,
  readOnly = false,
}: PrescriptionFormProps) {
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
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

  async function handleSavePrescription() {
    if (!medicineName.trim() || !dosage.trim() || !instructions.trim()) {
      alert("Please fill all prescription fields");
      return;
    }

    try {
      setSaving(true);

      const response = await createPrescription({
        appointmentId,
        doctorId,
        patientId,
        medicineName: medicineName.trim(),
        dosage: dosage.trim(),
        instructions: instructions.trim(),
      });

      setPrescriptions((prev) => [response.data, ...prev]);

      setSavedMessage("Prescription saved successfully");

      setMedicineName("");
      setDosage("");
      setInstructions("");

      setTimeout(() => {
        setSavedMessage("");
      }, 2000);
    } catch (error) {
      console.error("Failed to save prescription:", error);
      alert("Failed to save prescription");
    } finally {
      setSaving(false);
    }
  }

  const title = readOnly ? "Prescription" : "Prescription Form";
  const canCreatePrescription = role === "doctor" && !readOnly;

  if (!canCreatePrescription) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>

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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create a prescription for this patient and review saved items below.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Medicine Name
          </label>
          <input
            type="text"
            value={medicineName}
            onChange={(e) => setMedicineName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            placeholder="Enter medicine name"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Dosage
          </label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            placeholder="Enter dosage"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Instructions
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="min-h-[120px] w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
            placeholder="Enter instructions"
          />
        </div>

        <button
          onClick={handleSavePrescription}
          disabled={saving}
          className="rounded-xl bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Prescription"}
        </button>

        {savedMessage && (
          <p className="text-sm font-medium text-emerald-600">
            {savedMessage}
          </p>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <h3 className="text-lg font-semibold text-slate-800">
          Saved Prescriptions
        </h3>

        {loading ? (
          <p className="text-sm text-slate-500">Loading prescriptions...</p>
        ) : prescriptions.length === 0 ? (
          <p className="text-sm text-slate-500">
            No prescription has been saved yet.
          </p>
        ) : (
          prescriptions.map((prescription) => (
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
          ))
        )}
      </div>
    </div>
  );
}
