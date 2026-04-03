import { useEffect, useRef, useState, type RefObject } from "react";
import {
  getMessagesByAppointmentId,
  sendTelemedicineMessage,
} from "../../services/telemedicineApi";
import type { TelemedicineMessage } from "../../services/telemedicineApi";
import type { TelemedicineActorRole } from "../../utils/telemedicineAuth";

type ChatPanelProps = {
  role: TelemedicineActorRole;
  appointmentId: string;
  isChatOpen: boolean;
  unreadChatCount: number;
  canSendMessages?: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onClose?: () => void;
};

export default function ChatPanel({
  role,
  appointmentId,
  isChatOpen,
  unreadChatCount,
  canSendMessages = false,
  panelRef,
  onToggle,
  onClose,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<TelemedicineMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef(0);
  const savedScrollTopRef = useRef(0);
  const scrollStorageKey = `telemedicine-chat-scroll:${appointmentId}:${role}`;

  useEffect(() => {
    try {
      const savedScrollTop = window.sessionStorage.getItem(scrollStorageKey);
      savedScrollTopRef.current = savedScrollTop ? Number(savedScrollTop) || 0 : 0;
    } catch {
      savedScrollTopRef.current = 0;
    }
  }, [scrollStorageKey]);

  function persistScrollPosition(scrollTop: number) {
    savedScrollTopRef.current = scrollTop;

    try {
      window.sessionStorage.setItem(scrollStorageKey, String(scrollTop));
    } catch {
      // Ignore storage failures and keep in-memory scroll state.
    }
  }

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

  useEffect(() => {
    if (!isChatOpen) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (!messagesContainerRef.current) {
        return;
      }

      if (savedScrollTopRef.current > 0) {
        messagesContainerRef.current.scrollTop = savedScrollTopRef.current;
        return;
      }

      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, [isChatOpen]);

  useEffect(() => {
    const previousCount = previousMessageCountRef.current;
    const nextCount = messages.length;

    if (isChatOpen && nextCount > previousCount) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });

      window.requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          persistScrollPosition(messagesContainerRef.current.scrollTop);
        }
      });
    }

    previousMessageCountRef.current = nextCount;
  }, [isChatOpen, messages.length]);

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
    <div
      ref={panelRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
    >
      <style>{`
        @keyframes chat-hint-slide {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      <div
        className={`w-[22rem] max-w-[calc(100vw-2rem)] origin-bottom-right transition-all duration-300 ease-out md:w-[24rem] ${
          isChatOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-6 scale-90 opacity-0"
        }`}
      >
        <div className="flex h-[32rem] max-h-[calc(100vh-8rem)] flex-col rounded-2xl bg-white p-4 shadow-lg md:h-[36rem] md:p-6">
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

          <div
            ref={messagesContainerRef}
            onScroll={(event) => {
              persistScrollPosition(event.currentTarget.scrollTop);
            }}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
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
                  className={`flex p-1 ${
                    message.senderRole === role ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                      message.senderRole === role
                        ? "bg-blue-100 text-slate-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="mb-1">
                      <span
                        className={`text-sm font-semibold ${
                          message.senderRole === role ? "text-slate-800" : "text-slate-700"
                        }`}
                      >
                        {message.senderName}
                      </span>
                    </div>
                    <p
                      className={`text-sm ${
                        message.senderRole === role ? "text-slate-700" : "text-slate-600"
                      }`}
                    >
                      {message.message}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
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
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:bg-blue-700"
        aria-label={isChatOpen ? "Hide chat" : "Open chat"}
        title={isChatOpen ? "Hide chat" : "Open chat"}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {!isChatOpen && unreadChatCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold leading-none text-white shadow-sm">
            {unreadChatCount > 99 ? "99+" : unreadChatCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
