import { useEffect, useState } from "react";
import {
  getMessagesByAppointmentId,
  sendTelemedicineMessage,
} from "../../services/telemedicineApi";
import type { TelemedicineMessage } from "../../services/telemedicineApi";

type ChatPanelProps = {
  role: "doctor" | "patient";
  appointmentId: string;
};

export default function ChatPanel({
  role,
  appointmentId,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<TelemedicineMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function loadMessages() {
      try {
        const response = await getMessagesByAppointmentId(appointmentId);
        setMessages(response.data || []);
      } catch (error) {
        console.error("Failed to load messages:", error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    }

    if (appointmentId) {
      loadMessages();
    } else {
      setLoading(false);
    }
  }, [appointmentId]);

  async function handleSendMessage() {
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

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg md:p-6">
      <h2 className="mb-4 text-xl font-bold text-slate-800">Chat Panel</h2>

      <div className="h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                System
              </span>
              <span className="text-xs text-slate-500">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Consultation chat started.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  {message.senderName}
                </span>
                <span className="text-xs text-slate-500">
                  {message.createdAt
                    ? new Date(message.createdAt).toLocaleTimeString()
                    : ""}
                </span>
              </div>
              <p className="text-sm text-slate-600">{message.message}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
        />

        <button
          onClick={handleSendMessage}
          disabled={sending || !messageInput.trim()}
          className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}