import { useState } from "react";

type PrescriptionFormProps = {
  role: "doctor" | "patient";
};

export default function PrescriptionForm({
  role,
}: PrescriptionFormProps) {
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  function handleSavePrescription() {
    if (!medicineName.trim() || !dosage.trim() || !instructions.trim()) {
      alert("Please fill all prescription fields");
      return;
    }

    setSavedMessage("Prescription saved successfully");

    setTimeout(() => {
      setSavedMessage("");
    }, 2000);

    setMedicineName("");
    setDosage("");
    setInstructions("");
  }

  if (role !== "doctor") {
    return (
      <div className="rounded-2xl bg-white shadow-lg p-4 md:p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
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
    <div className="rounded-2xl bg-white shadow-lg p-4 md:p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">
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
          className="rounded-xl bg-purple-600 px-4 py-2 text-white font-medium hover:bg-purple-700"
        >
          Save Prescription
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