import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SymptomChatBox from "../../components/ai/SymptomChatBox";
import { getSymptomCheckById } from "../../services/symptomAiApi";
import type { SymptomCheckRecord } from "../../services/symptomAiApi";

function getUrgencyClasses(urgency: "low" | "medium" | "high") {
  if (urgency === "high") {
    return "bg-red-100 text-red-700 border border-red-200";
  }

  if (urgency === "medium") {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }

  return "bg-green-100 text-green-700 border border-green-200";
}

export default function SymptomCheckDetails() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<SymptomCheckRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRecord() {
      if (!id) {
        setError("Symptom check ID not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getSymptomCheckById(id);
        setRecord(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load record.");
      } finally {
        setLoading(false);
      }
    }

    loadRecord();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Loading symptom check details...</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm text-red-600">{error || "Record not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Symptom Check Result
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review your symptom analysis and ask follow-up questions.
            </p>
          </div>

          <div
            className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold capitalize ${getUrgencyClasses(
              record.analysis.urgency
            )}`}
          >
            {record.analysis.urgency} urgency
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Category
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              {record.analysis.category}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Department
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              {record.analysis.department}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Recommended Next Step
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {record.analysis.nextStep}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              AI Explanation
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {record.aiExplanation}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Disclaimer
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {record.analysis.disclaimer}
            </p>
          </div>
        </div>
      </section>

      <SymptomChatBox
        symptomCheckId={record._id}
        initialChatHistory={record.chatHistory}
      />
    </div>
  );
}