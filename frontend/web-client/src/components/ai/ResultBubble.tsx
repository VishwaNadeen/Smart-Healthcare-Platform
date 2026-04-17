import { Link } from "react-router-dom";
import type { SymptomCheckRecord } from "../../services/symptomAiApi";

function urgencyColor(urgency: "low" | "medium" | "high") {
  if (urgency === "high") return "bg-red-100 text-red-700 border-red-200";
  if (urgency === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-green-100 text-green-700 border-green-200";
}

export default function ResultBubble({ record }: { record: SymptomCheckRecord }) {
  const { analysis, recommendation, aiExplanation } = record;
  if (!analysis || !recommendation) return null;

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[85%] space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-slate-800">Here's what I found based on your symptoms:</p>
          <span className={`shrink-0 inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${urgencyColor(analysis.urgency)}`}>
            {analysis.urgency} urgency
          </span>
        </div>

        {recommendation.emergency ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            ⚠️ This looks urgent. Please seek emergency medical care immediately.
          </p>
        ) : null}

        <p>
          Your symptoms fall under the{" "}
          <span className="font-medium capitalize text-slate-800">{analysis.category}</span>{" "}
          category. I'd recommend consulting a{" "}
          <span className="font-medium text-slate-800">{analysis.department}</span>.
        </p>

        {aiExplanation ? <p>{aiExplanation}</p> : null}

        <p className="font-medium text-slate-800">What you should do next:</p>
        <p>{analysis.nextStep}</p>

        {recommendation.shouldBookAppointment || recommendation.shouldStartTelemedicine ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {recommendation.shouldBookAppointment ? (
              <Link
                to="/appointments/patient"
                className="inline-flex items-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
              >
                Book Appointment
              </Link>
            ) : null}
            {recommendation.shouldStartTelemedicine ? (
              <Link
                to="/patient-sessions"
                className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
              >
                Start Telemedicine
              </Link>
            ) : null}
          </div>
        ) : null}

        <p className="border-t border-slate-200 pt-2 text-xs text-slate-400">
          This is not a final medical diagnosis. Please consult a qualified doctor for professional advice.
        </p>
      </div>
    </div>
  );
}
