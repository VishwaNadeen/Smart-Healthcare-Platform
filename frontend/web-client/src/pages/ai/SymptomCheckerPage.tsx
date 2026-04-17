import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import RequirePatient from "../../components/auth/RequirePatient";
import SymptomResultSummaryCard from "../../components/ai/SymptomResultSummaryCard";
import {
  sendSymptomChatMessage,
  startSymptomConversation,
} from "../../services/symptomAiApi";
import type {
  ChatMessage,
  SymptomCheckRecord,
} from "../../services/symptomAiApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

type PendingMessage = {
  role: "user";
  message: string;
  timestamp: string;
};

function SymptomCheckerPageContent() {
  const auth = getStoredTelemedicineAuth();
  const patientIdFromAuth = auth?.userId || "";

  const [activeRecord, setActiveRecord] = useState<SymptomCheckRecord | null>(null);

  const [startMessage, setStartMessage] = useState("");
  const [chatMessage, setChatMessage] = useState("");

  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");

  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);

  const currentQuestion = activeRecord?.currentQuestion ?? null;
  const isCollecting = activeRecord?.conversationStage === "collecting";
  const isCompleted = activeRecord?.conversationStage === "completed";
  const isClosed = activeRecord?.conversationStage === "closed";
  const canUseChecker = Boolean(patientIdFromAuth);

  const combinedChatHistory = useMemo(() => {
    const history = activeRecord?.chatHistory ?? [];

    if (!pendingMessage) {
      return history;
    }

    return [...history, pendingMessage];
  }, [activeRecord, pendingMessage]);

  const showBooleanQuickReplies =
    isCollecting && currentQuestion?.type === "boolean" && !sending;

  async function handleStartConversation() {
    const trimmedMessage = startMessage.trim();

    if (!trimmedMessage || starting) {
      return;
    }

    if (!patientIdFromAuth) {
      setError("Logged-in patient ID was not found from login data.");
      return;
    }

    try {
      setStarting(true);
      setError("");
      setChatError("");
      setPendingMessage(null);

      const result = await startSymptomConversation(trimmedMessage);

      setActiveRecord(result);
      setStartMessage("");
      setChatMessage("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start symptom conversation."
      );
    } finally {
      setStarting(false);
    }
  }

  async function handleSendMessage(nextMessage?: string) {
    if (!activeRecord || sending || isClosed) {
      return;
    }

    const text = (nextMessage ?? chatMessage).trim();

    if (!text) {
      return;
    }

    const optimisticMessage: PendingMessage = {
      role: "user",
      message: text,
      timestamp: new Date().toISOString(),
    };

    try {
      setSending(true);
      setChatError("");
      setPendingMessage(optimisticMessage);
      setChatMessage("");

      const result = await sendSymptomChatMessage(activeRecord._id, text);

      setActiveRecord(result.symptomCheck);
      setPendingMessage(null);
    } catch (err) {
      setPendingMessage(null);
      setChatMessage(text);
      setChatError(
        err instanceof Error ? err.message : "Failed to send message."
      );
    } finally {
      setSending(false);
    }
  }

  function handleStartKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleStartConversation();
    }
  }

  function handleChatKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  function handleStartNewFresh() {
    setActiveRecord(null);
    setStartMessage("");
    setChatMessage("");
    setError("");
    setChatError("");
    setPendingMessage(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-200" />
        <div className="p-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-800">AI Symptom Checker</h1>
            <p className="mt-2 text-sm text-slate-500">
              Chat naturally about your symptoms. The assistant will guide you step by
              step on this same page.
            </p>
          </div>
        </div>
      </div>

      {!canUseChecker ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700 shadow-sm">
          Logged-in patient ID was not found. Please log in as a patient first.
        </div>
      ) : null}

      {!activeRecord ? (
        <section className="rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-100 px-6 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Start a New Symptom Conversation
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Example: I have fever and headache for 2 days.
                </p>
              </div>

              <Link
                to="/ai/history"
                className="inline-flex w-fit items-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                View Symptom History
              </Link>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <label className="mb-3 block text-sm font-medium text-slate-700">
                Tell the assistant how you feel
              </label>

              <textarea
                value={startMessage}
                onChange={(e) => setStartMessage(e.target.value)}
                onKeyDown={handleStartKeyDown}
                rows={5}
                placeholder="Describe your symptoms in your own words..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-3 text-xs text-slate-400">
                Press Enter to start, or Shift + Enter for a new line.
              </p>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-2 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-slate-400">
                This tool does not provide a final diagnosis. Always consult a doctor
                for medical advice.
              </p>

              <button
                type="button"
                onClick={handleStartConversation}
                disabled={starting || !startMessage.trim() || !canUseChecker}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {starting ? "Starting..." : "Start Conversation"}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleStartNewFresh}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Start New Conversation
            </button>
          </div>

          <section className="rounded-2xl border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">
                {isCollecting ? "AI Symptom Interview" : "Conversation"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {isCollecting
                  ? "Answer naturally. The assistant will continue step by step."
                  : "You can continue with follow-up questions here."}
              </p>
            </div>

            <div className="max-h-[520px] space-y-4 overflow-y-auto px-5 py-4">
              {combinedChatHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-6 text-center text-sm text-slate-600">
                  Your symptom conversation will appear here.
                </div>
              ) : (
                combinedChatHistory.map((item: ChatMessage, index: number) => {
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
                        <div className="whitespace-pre-wrap text-sm leading-6">
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

              {sending ? (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 shadow-sm">
                    AI is replying...
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-blue-100 px-5 py-4">
              {chatError ? (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {chatError}
                </div>
              ) : null}

              {showBooleanQuickReplies ? (
                <div className="mb-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleSendMessage("yes")}
                    className="inline-flex min-w-[110px] items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Yes
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage("no")}
                    className="inline-flex min-w-[110px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    No
                  </button>
                </div>
              ) : null}

              {!isClosed ? (
                <div className="space-y-3">
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    rows={3}
                    placeholder={
                      isCollecting
                        ? currentQuestion?.type === "number"
                          ? "Type a number..."
                          : "Type your answer..."
                        : "Ask a follow-up question..."
                    }
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">
                      Press Enter to send, or Shift + Enter for a new line.
                    </p>

                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={sending || !chatMessage.trim()}
                      className="inline-flex min-w-[120px] items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  This conversation is closed.
                </div>
              )}
            </div>
          </section>

          {isCompleted && activeRecord.analysis ? (
            <SymptomResultSummaryCard record={activeRecord} showActions />
          ) : null}
        </div>
      )}
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
