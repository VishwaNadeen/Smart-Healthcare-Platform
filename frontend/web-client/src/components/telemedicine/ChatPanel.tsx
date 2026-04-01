import { useEffect, useState } from "react";
import {
  getMessagesByAppointmentId,
  sendTelemedicineMessage,
} from "../../services/telemedicineApi";
import type { TelemedicineMessage } from "../../services/telemedicineApi";

type ChatPanelProps = {
  role: "doctor" | "patient";
  appointmentId: string;
  canSendMessages?: boolean;
  onClose?: () => void;
};

export default function ChatPanel({
  role,
  appointmentId,
  canSendMessages = false,
  onClose,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<TelemedicineMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      try {
        const response = await getMessagesByAppointmentId(appointmentId);
        if (isMounted) {
          setMessages(response.data || []);
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
        if (isMounted) {
          setMessages([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (appointmentId) {
      loadMessages();
      const intervalId = window.setInterval(loadMessages, 3000);

      return () => {
        isMounted = false;
        window.clearInterval(intervalId);
      };
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [appointmentId]);

  async function handleSendMessage() {
    if (!canSendMessages) return;
    if (!messageInput.trim()) return;

    try {
      setSending(true);

      const response = await sendTelemedicineMessage({
        appointmentId,
        senderRole: role,
        senderName: role === "doctor" ? "Doctor" : "Patient",
        message: messageInput.trim(),
      });

      setMessages((prev) => [...prev, response.data]);
      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  }

  const latestTimestamp =
    messages.length > 0
      ? messages[messages.length - 1]?.createdAt
      : new Date().toISOString();
  const headerTime = latestTimestamp
    ? new Date(latestTimestamp).toLocaleTimeString()
    : "";
  const disabledHint =
    "Chat unlocks when both doctor and patient are here.";

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-lg md:p-6">
      <style>{`
        @keyframes chat-hint-slide {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Chat Panel</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{headerTime}</span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="Close chat"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-[17rem] flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="p-1">
            <p className="text-sm text-slate-500">No messages yet.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className="p-1"
            >
              <div className="mb-1">
                <span className="text-sm font-semibold text-slate-700">
                  {message.senderName}
                </span>
              </div>
              <p className="text-sm text-slate-600">{message.message}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <div className="relative flex-1 overflow-hidden rounded-xl">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={canSendMessages ? "Type a message..." : ""}
            disabled={!canSendMessages || sending}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          />

          {!canSendMessages ? (
            <div className="pointer-events-none absolute inset-x-3 inset-y-0 flex items-center overflow-hidden">
              <span
                className="whitespace-nowrap text-slate-400"
                style={{ animation: "chat-hint-slide 10s linear infinite" }}
              >
                {disabledHint}
              </span>
            </div>
          ) : null}
        </div>

        <button
          onClick={handleSendMessage}
          disabled={sending || !messageInput.trim() || !canSendMessages}
          className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

    </div>
  );
}
