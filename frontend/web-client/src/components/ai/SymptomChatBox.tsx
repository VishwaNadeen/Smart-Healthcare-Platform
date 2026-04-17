import { useEffect, useRef, useState } from "react";
import ResultBubble from "./ResultBubble";
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
  record?: SymptomCheckRecord | null;
  onRecordUpdated?: (record: SymptomCheckRecord) => void;
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}


export default function SymptomChatBox({
  symptomCheckId,
  initialChatHistory = [],
  currentQuestion = null,
  conversationStage = "completed",
  record = null,
  onRecordUpdated,
}: Props) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(initialChatHistory);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // index where completion happened — ResultBubble inserts here, follow-ups appear after
  const [completionIndex, setCompletionIndex] = useState<number | null>(
    conversationStage === "completed" ? initialChatHistory.length : null
  );

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const isCollecting = conversationStage === "collecting";
  const isCompleted = conversationStage === "completed";
  const isClosed = conversationStage === "closed";
  const showBooleanQuickReplies = isCollecting && currentQuestion?.type === "boolean" && !loading;

  useEffect(() => {
    if (conversationStage === "completed" && completionIndex === null) {
      setCompletionIndex(chatHistory.length);
    }
  }, [conversationStage]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatHistory, loading]);

  async function submitMessage(nextMessage: string) {
    const trimmedMessage = nextMessage.trim();
    if (!trimmedMessage || loading || isClosed) return;

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
      setError(err instanceof Error ? err.message : "Failed to send message.");
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
      setMessage(trimmedMessage);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage(message);
    }
  }

  return (
    <section className="flex h-[540px] flex-col rounded-2xl border border-blue-100 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">
          {isCollecting ? "AI Symptom Interview" : "Symptom Conversation"}
        </h2>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 space-y-4 overflow-y-auto border-t border-slate-200 px-6 pb-2 pt-5"
      >
        {chatHistory.length === 0 && !isCompleted ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-blue-50 p-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-sm text-slate-400">Start answering the assistant's questions.</p>
          </div>
        ) : null}

        {/* messages before completion */}
        {chatHistory.slice(0, completionIndex ?? chatHistory.length).map((item, index) => {
          const isUser = item.role === "user";
          const isLastAi = !isUser && index === (completionIndex ?? chatHistory.length) - 1;
          const showQuickReplies = isLastAi && showBooleanQuickReplies;
          return (
            <div key={`pre-${item.role}-${item.timestamp}-${index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${isUser ? "bg-blue-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-800"}`}>
                <div className="whitespace-pre-wrap text-sm leading-6">{item.message}</div>
                <div className={`mt-1.5 text-[11px] ${isUser ? "text-blue-100" : "text-slate-400"}`}>{formatTimestamp(item.timestamp)}</div>
                {showQuickReplies ? (
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => submitMessage("yes")} className="inline-flex min-w-[64px] items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700">Yes</button>
                    <button type="button" onClick={() => submitMessage("no")} className="inline-flex min-w-[64px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">No</button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* result bubble at completion point */}
        {isCompleted && record?.analysis && completionIndex !== null ? <ResultBubble record={record} /> : null}

        {/* follow-up messages after completion */}
        {completionIndex !== null ? chatHistory.slice(completionIndex).map((item, index) => {
          const isUser = item.role === "user";
          return (
            <div key={`post-${item.role}-${item.timestamp}-${index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${isUser ? "bg-blue-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-800"}`}>
                <div className="whitespace-pre-wrap text-sm leading-6">{item.message}</div>
                <div className={`mt-1.5 text-[11px] ${isUser ? "text-blue-100" : "text-slate-400"}`}>{formatTimestamp(item.timestamp)}</div>
              </div>
            </div>
          );
        }) : null}

        {loading ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
            </div>
          </div>
        ) : null}
      </div>

      {/* Input */}
      <div className="px-5 pb-5 pt-3">
        {error ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
        ) : null}

        {isClosed ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">This conversation is closed.</div>
        ) : (
          <div className="relative rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.10)]">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
              placeholder={
                isCollecting
                  ? currentQuestion?.type === "number" ? "Type a number..." : "Type your answer..."
                  : "Ask a follow-up question..."
              }
              className="w-full resize-none rounded-2xl bg-transparent py-3 pl-4 pr-14 text-sm text-slate-700 outline-none transition disabled:text-slate-400"
            />
            <button
              type="button"
              onClick={() => submitMessage(message)}
              disabled={loading || !message.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-xl bg-blue-600 p-2.5 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        )}

        <p className="mt-2 text-center text-xs text-slate-400">
          This tool does not provide a final diagnosis. Always consult a doctor for medical advice.
        </p>
      </div>
    </section>
  );
}
