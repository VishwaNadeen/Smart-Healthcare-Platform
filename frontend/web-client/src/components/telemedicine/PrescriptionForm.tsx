import { useState } from "react";
import { createPrescription } from "../../services/telemedicineApi";

type PrescriptionFormProps = {
  role: "doctor" | "patient";
  appointmentId: string;
  doctorId: string;
  patientId: string;
};

export default function PrescriptionForm({
  role,
  appointmentId,
  doctorId,
  patientId,
}: PrescriptionFormProps) {
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  async function handleSavePrescription() {
    if (!medicineName.trim() || !dosage.trim() || !instructions.trim()) {
      alert("Please fill all prescription fields");
      return;
    }

    try {
      setSaving(true);

      await createPrescription({
        appointmentId,
        doctorId,
        patientId,
        medicineName: medicineName.trim(),
        dosage: dosage.trim(),
        instructions: instructions.trim(),
      });

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

  if (role !== "doctor") {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-lg md:p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-800">
          Prescription
        </h2>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">
            Only doctors can create prescriptions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg md:p-6">
      <h2 className="mb-4 text-xl font-bold text-slate-800">
        Prescription Form
      </h2>

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
    </div>
  );
}