import { useState } from "react";
import { Link } from "react-router-dom";
import type { SymptomCheckRecord } from "../../services/symptomAiApi";

type Props = {
  record: SymptomCheckRecord;
  showActions?: boolean;
  compact?: boolean;
};

function getUrgencyClasses(urgency: "low" | "medium" | "high") {
  if (urgency === "high") {
    return "bg-red-100 text-red-700 border border-red-200";
  }

  if (urgency === "medium") {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }

  return "bg-green-100 text-green-700 border border-green-200";
}

export default function SymptomResultSummaryCard({
  record,
  showActions = true,
  compact = false,
}: Props) {
  const { analysis, recommendation, aiExplanation } = record;
  if (!analysis || !recommendation) return null;
  const [isExpanded, setIsExpanded] = useState(!compact);

  function handleToggle() {
    if (!compact) {
      return;
    }

    setIsExpanded((current) => !current);
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
      <div
        role={compact ? "button" : undefined}
        tabIndex={compact ? 0 : undefined}
        onClick={compact ? handleToggle : undefined}
        onKeyDown={
          compact
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleToggle();
                }
              }
            : undefined
        }
        className={`flex flex-col gap-4 md:flex-row md:items-start md:justify-between ${
          compact ? "cursor-pointer" : ""
        }`}
        aria-label={compact ? (isExpanded ? "Collapse symptom result" : "Expand symptom result") : undefined}
      >
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800">Symptom Check Result</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review your symptom analysis and recommended next steps.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold capitalize ${getUrgencyClasses(
              analysis.urgency
            )}`}
          >
            {analysis.urgency} urgency
          </div>

          {compact ? (
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 transition hover:bg-blue-100">
              <svg
                className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? "mt-6 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {recommendation.emergency ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <h3 className="text-base font-semibold text-red-700">
                Emergency Attention Recommended
              </h3>
              <p className="mt-2 text-sm leading-6 text-red-600">
                Your symptom analysis suggests urgent medical attention. Please seek
                emergency care or contact a medical professional immediately.
              </p>
            </div>
          ) : null}

          <div className={`${recommendation.emergency ? "mt-6" : ""} grid gap-4 md:grid-cols-2`}>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Category
              </p>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {analysis.category}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Department
              </p>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {analysis.department}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Recommended Next Step
              </p>
              <p className="mt-2 text-sm text-slate-700">{analysis.nextStep}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                AI Explanation
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {aiExplanation}
              </p>
            </div>

            {!compact ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Disclaimer
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {analysis.disclaimer}
                </p>
              </div>
            ) : null}
          </div>

          {showActions ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-800">
                Suggested Actions
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Based on your symptom result, these are the recommended next actions.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {recommendation.shouldBookAppointment ? (
                  <Link
                    to="/appointments/patient"
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Book Appointment
                  </Link>
                ) : null}

                {recommendation.shouldStartTelemedicine ? (
                  <Link
                    to="/patient-sessions"
                    className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    Start Telemedicine
                  </Link>
                ) : null}

                <Link
                  to={`/ai/check/${record._id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  View Full Details
                </Link>
              </div>

              {!recommendation.shouldBookAppointment &&
              !recommendation.shouldStartTelemedicine &&
              !recommendation.emergency ? (
                <p className="mt-4 text-sm text-slate-600">
                  No immediate escalation is suggested right now. Monitor your symptoms
                  and consult a doctor if they continue or worsen.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
