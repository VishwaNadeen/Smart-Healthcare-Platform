import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SymptomChatBox from "../../components/ai/SymptomChatBox";
import RequirePatient from "../../components/auth/RequirePatient";
import PageLoading from "../../components/common/PageLoading";
import {
  getSymptomCheckById,
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


function SymptomCheckDetailsContent() {
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
    return <PageLoading message="Loading symptom check details..." />;
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

  const isCompleted = record.conversationStage === "completed";
  const isClosed = record.conversationStage === "closed";

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-center w-full">
            <h1 className="text-xl font-semibold text-slate-800">
              Symptom Check Session
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {isCompleted
                ? "Your symptom interview is complete. You can ask follow-up questions."
                : "Continue answering the AI assistant to complete your symptom check."}
            </p>

            <div className="mt-2 text-left text-xs text-slate-400">
              <div>Created: {formatDateTime(record.createdAt)}</div>
              <div>Last active: {timeAgo(record.updatedAt)}</div>
            </div>
          </div>

        </div>

      </section>


      {!isClosed ? (
        <SymptomChatBox
          symptomCheckId={record._id}
          initialChatHistory={record.chatHistory}
          currentQuestion={record.currentQuestion}
          conversationStage={record.conversationStage}
          record={record}
          onRecordUpdated={setRecord}
        />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Conversation Closed
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This symptom check has been marked as closed. Reopen it if you want to
            continue the conversation.
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
