import { useMemo, useState } from "react";
import type React from "react";
import { sendSymptomChatMessage } from "../../services/symptomAiApi";
import type {
  ChatMessage,
  SymptomCheckRecord,
  SymptomQuestion,
} from "../../services/symptomAiApi";

type Props = {
  symptomCheckId: string;
  initialChatHistory?: ChatMessage[];
  currentQuestion?: SymptomQuestion | null;
  conversationStage?: "collecting" | "completed" | "closed";
  onRecordUpdated?: (record: SymptomCheckRecord) => void;
};

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

export default function SymptomChatBox({
  symptomCheckId,
  initialChatHistory = [],
  currentQuestion = null,
  conversationStage = "completed",
  onRecordUpdated,
}: Props) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(initialChatHistory);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasMessages = useMemo(() => chatHistory.length > 0, [chatHistory]);
  const isCollecting = conversationStage === "collecting";
  const showBooleanQuickReplies =
    isCollecting && currentQuestion?.type === "boolean";

  async function submitMessage(nextMessage: string) {
    const trimmedMessage = nextMessage.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    setLoading(true);
    setError("");

    const tempUserMessage: ChatMessage = {
      role: "user",
      message: trimmedMessage,
      timestamp: new Date().toISOString(),
    };

    setChatHistory((prev) => [...prev, tempUserMessage]);
    setMessage("");

    try {
      const result = await sendSymptomChatMessage(symptomCheckId, trimmedMessage);

      setChatHistory(result.chatHistory);
      onRecordUpdated?.(result.symptomCheck);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message.";

      setError(errorMessage);

      setChatHistory((prev) =>
        prev.filter(
          (item) =>
            !(
              item.role === "user" &&
              item.message === tempUserMessage.message &&
              item.timestamp === tempUserMessage.timestamp
            )
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage(message);
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-blue-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-800">
          {isCollecting ? "AI Symptom Interview" : "Ask Follow-up Questions"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {isCollecting
            ? "Answer the assistant step by step to complete your symptom check."
            : "Ask about urgency, doctor recommendation, or next steps."}
        </p>
      </div>

      <div className="max-h-[460px] space-y-4 overflow-y-auto px-5 py-4">
        {!hasMessages ? (
          <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-6 text-center text-sm text-slate-600">
            {isCollecting
              ? "Start answering the assistant's questions."
              : "No chat yet. Ask something like:"}

            {!isCollecting ? (
              <div className="mt-3 space-y-2 text-left">
                <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  Is this serious?
                </div>
                <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  Should I book a doctor?
                </div>
                <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  Why did you suggest this department?
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          chatHistory.map((item, index) => {
            const isUser = item.role === "user";

            return (
              <div
                key={`${item.role}-${item.timestamp}-${index}`}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    isUser
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="text-sm leading-6 whitespace-pre-wrap">
                    {item.message}
                  </div>
                  <div
                    className={`mt-2 text-[11px] ${
                      isUser ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    {formatTimestamp(item.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 shadow-sm">
              AI is replying...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-blue-100 px-5 py-4">
        {error ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {showBooleanQuickReplies ? (
          <div className="mb-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => submitMessage("yes")}
              disabled={loading}
              className="inline-flex min-w-[110px] items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              Yes
            </button>

            <button
              type="button"
              onClick={() => submitMessage("no")}
              disabled={loading}
              className="inline-flex min-w-[110px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              No
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder={
              isCollecting
                ? currentQuestion?.type === "number"
                  ? "Type a number..."
                  : "Type your answer..."
                : "Type your follow-up question..."
            }
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {isCollecting
                ? "Answer briefly so the assistant can continue the interview."
                : "Example: Should I consult online today?"}
            </p>

            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="inline-flex min-w-[120px] items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}