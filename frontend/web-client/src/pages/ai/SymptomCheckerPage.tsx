import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  analyzeSymptoms,
  getLatestSymptomCheck,
  getSymptomQuestions,
} from "../../services/symptomAiApi";
import type {
  SymptomCheckRecord,
  SymptomQuestion,
} from "../../services/symptomAiApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";
import RequirePatient from "../../components/auth/RequirePatient";

type SymptomFormState = Record<string, boolean | number>;

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString();
}

function timeAgo(value: string) {
  const now = new Date();
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;

  return date.toLocaleDateString();
}

function getUrgencyClasses(urgency: "low" | "medium" | "high") {
  if (urgency === "high") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (urgency === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-green-200 bg-green-50 text-green-700";
}

function SymptomCheckerPageContent() {
  const navigate = useNavigate();
  const auth = getStoredTelemedicineAuth();

  const patientIdFromAuth = auth?.userId || "";

  const [questions, setQuestions] = useState<SymptomQuestion[]>([]);
  const [latestRecord, setLatestRecord] = useState<SymptomCheckRecord | null>(null);
  const [formData, setFormData] = useState<SymptomFormState>({});
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [latestError, setLatestError] = useState("");

  useEffect(() => {
    async function loadQuestions() {
      try {
        setLoadingQuestions(true);
        setError("");

        const data = await getSymptomQuestions();
        setQuestions(data);

        const initialValues: SymptomFormState = {};

        data.forEach((item) => {
          if (item.type === "boolean") {
            initialValues[item.id] = false;
          } else if (item.type === "number") {
            initialValues[item.id] = 0;
          }
        });

        setFormData(initialValues);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load symptom questions."
        );
      } finally {
        setLoadingQuestions(false);
      }
    }

    loadQuestions();
  }, []);

  useEffect(() => {
    async function loadLatestRecord() {
      try {
        setLoadingLatest(true);
        setLatestError("");

        const data = await getLatestSymptomCheck();
        setLatestRecord(data);
      } catch (err) {
        setLatestRecord(null);
        setLatestError(
          err instanceof Error ? err.message : "Failed to load latest symptom check."
        );
      } finally {
        setLoadingLatest(false);
      }
    }

    loadLatestRecord();
  }, []);

  useEffect(() => {
    if (!latestRecord || questions.length === 0) return;

    const updatedValues: SymptomFormState = {};

    questions.forEach((item) => {
      if (item.type === "boolean") {
        updatedValues[item.id] = false;
      } else if (item.type === "number") {
        updatedValues[item.id] = 0;
      }
    });

    if (latestRecord.symptoms) {
      Object.entries(latestRecord.symptoms).forEach(([key, value]) => {
        if (key in updatedValues) {
          updatedValues[key] = value as boolean | number;
        }
      });
    }

    setFormData(updatedValues);
  }, [latestRecord, questions]);

  const booleanQuestions = useMemo(
    () => questions.filter((item) => item.type === "boolean"),
    [questions]
  );

  const numberQuestions = useMemo(
    () => questions.filter((item) => item.type === "number"),
    [questions]
  );

  function handleBooleanChange(name: string, value: boolean) {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleNumberChange(name: string, value: string) {
    const parsedValue = value === "" ? 0 : Number(value);

    setFormData((prev) => ({
      ...prev,
      [name]: Number.isNaN(parsedValue) ? 0 : parsedValue,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!patientIdFromAuth) {
      setError("Logged-in patient ID was not found from login data.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const result = await analyzeSymptoms(formData);
      navigate(`/ai/check/${result._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze symptoms.");
    } finally {
      setSubmitting(false);
    }
  }

  const canUseChecker = Boolean(patientIdFromAuth);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">AI Symptom Checker</h1>
          <p className="mt-2 text-sm text-slate-500">
            Answer a few questions to get a symptom analysis and AI explanation.
          </p>
        </div>

        <Link
          to="/ai/history"
          className="inline-flex w-fit items-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-50"
        >
          View Symptom History
        </Link>
      </div>

      {loadingLatest ? (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Loading latest symptom check...</p>
        </div>
      ) : null}

      {!loadingLatest && latestError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-600 shadow-sm">
          {latestError}
        </div>
      ) : null}

      {!loadingLatest && !latestError && latestRecord ? (
        <section className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Resume Latest Symptom Check
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Last saved on {formatDateTime(latestRecord.createdAt)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Last active: {timeAgo(latestRecord.updatedAt)}
              </p>
            </div>

            <div
              className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-semibold capitalize ${getUrgencyClasses(
                latestRecord.analysis.urgency
              )}`}
            >
              {latestRecord.analysis.urgency} urgency
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Department
              </p>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {latestRecord.analysis.department}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Category
              </p>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {latestRecord.analysis.category}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              to={`/ai/check/${latestRecord._id}`}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Open Latest Result
            </Link>

            <Link
              to={`/ai/check/${latestRecord._id}`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Continue Chat
            </Link>
          </div>
        </section>
      ) : null}

      {!canUseChecker ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700 shadow-sm">
          Logged-in patient ID was not found. Please log in as a patient first.
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-blue-100 bg-white shadow-sm"
      >
        <div className="border-b border-blue-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-800">
            Symptom Questionnaire
          </h2>
          {latestRecord ? (
            <p className="mt-1 text-xs text-blue-500">
              Prefilled using your latest symptom check
            </p>
          ) : null}
          <p className="mt-1 text-sm text-slate-500">
            Fill in your symptom details carefully.
          </p>
        </div>

        {loadingQuestions ? (
          <div className="px-6 py-10">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Loading questions...
            </div>
          </div>
        ) : (
          <div className="space-y-8 px-6 py-6">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Logged-in Patient ID
              </label>
              <input
                type="text"
                value={patientIdFromAuth}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <p className="mt-2 text-xs text-slate-400">
                This value is loaded automatically from login data.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-800">
                Symptom Questions
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {booleanQuestions.map((item) => {
                  const currentValue = Boolean(formData[item.id]);

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <p className="text-sm font-medium text-slate-700">
                        {item.question}
                      </p>

                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleBooleanChange(item.id, true)}
                          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                            currentValue
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          Yes
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBooleanChange(item.id, false)}
                          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                            !currentValue
                              ? "bg-slate-700 text-white"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {numberQuestions.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-base font-semibold text-slate-800">
                  Duration and Additional Details
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {numberQuestions.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        {item.question}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={Number(formData[item.id] || 0)}
                        onChange={(e) => handleNumberChange(item.id, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-2 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-slate-400">
                This tool does not provide a final diagnosis. Always consult a doctor
                for medical advice.
              </p>

              <button
                type="submit"
                disabled={submitting || loadingQuestions || !canUseChecker}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {submitting ? "Analyzing..." : "Analyze Symptoms"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default function SymptomCheckerPage() {
  return (
    <RequirePatient>
      <SymptomCheckerPageContent />
    </RequirePatient>
  );
}