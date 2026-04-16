import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SymptomChatBox from "../../components/ai/SymptomChatBox";
import SymptomResultSummaryCard from "../../components/ai/SymptomResultSummaryCard";
import RequirePatient from "../../components/auth/RequirePatient";
import {
  closeSymptomCheck,
  getSymptomCheckById,
  reopenSymptomCheck,
} from "../../services/symptomAiApi";
import type { SymptomCheckRecord } from "../../services/symptomAiApi";

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

function getStatusClasses(status: "completed" | "follow_up_pending" | "closed") {
  if (status === "closed") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  if (status === "follow_up_pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-green-200 bg-green-50 text-green-700";
}

function SymptomCheckDetailsContent() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<SymptomCheckRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

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

  async function handleCloseCheck() {
    if (!record || closing || record.status === "closed") {
      return;
    }

    try {
      setClosing(true);
      setActionError("");

      const updatedRecord = await closeSymptomCheck(record._id);
      setRecord(updatedRecord);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to close symptom check."
      );
    } finally {
      setClosing(false);
    }
  }

  async function handleReopenCheck() {
    if (!record || reopening || record.status !== "closed") {
      return;
    }

    try {
      setReopening(true);
      setActionError("");

      const updatedRecord = await reopenSymptomCheck(record._id);
      setRecord(updatedRecord);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to reopen symptom check."
      );
    } finally {
      setReopening(false);
    }
  }

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
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">
              Symptom Check Session
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage the status of this symptom check conversation.
            </p>

            <div className="mt-2 text-xs text-slate-400">
              <div>Created: {formatDateTime(record.createdAt)}</div>
              <div>Last active: {timeAgo(record.updatedAt)}</div>
            </div>
          </div>

          <div
            className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-semibold capitalize ${getStatusClasses(
              record.status
            )}`}
          >
            {record.status.replaceAll("_", " ")}
          </div>
        </div>

        {actionError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {actionError}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {record.status !== "closed" ? (
            <button
              type="button"
              onClick={handleCloseCheck}
              disabled={closing}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {closing ? "Closing..." : "Close Conversation"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReopenCheck}
              disabled={reopening}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reopening ? "Reopening..." : "Reopen Conversation"}
            </button>
          )}
        </div>
      </section>

      <SymptomResultSummaryCard record={record} showActions />

      {record.status !== "closed" ? (
        <SymptomChatBox
          symptomCheckId={record._id}
          initialChatHistory={record.chatHistory}
        />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Conversation Closed
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This symptom check has been marked as closed. Reopen it if you want to
            continue follow-up chat on this record.
          </p>
        </section>
      )}
    </div>
  );
}

export default function SymptomCheckDetails() {
  return (
    <RequirePatient>
      <SymptomCheckDetailsContent />
    </RequirePatient>
  );
}