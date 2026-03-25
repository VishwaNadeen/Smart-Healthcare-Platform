import { useState } from "react";

type ChatMessage = {
  id: number;
  sender: string;
  text: string;
  time: string;
};

type ChatPanelProps = {
  role: "doctor" | "patient";
};

export default function ChatPanel({ role }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "System",
      text: "Consultation chat started.",
      time: new Date().toLocaleTimeString(),
    },
  ]);

  const [messageInput, setMessageInput] = useState("");

  function handleSendMessage() {
    if (!messageInput.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      sender: role === "doctor" ? "Doctor" : "Patient",
      text: messageInput,
      time: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageInput("");
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg p-4 md:p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Chat Panel</h2>

      <div className="h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className="rounded-lg bg-white border border-slate-200 p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-slate-700">
                {message.sender}
              </span>
              <span className="text-xs text-slate-500">{message.time}</span>
            </div>
            <p className="text-sm text-slate-600">{message.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
        />

        <button
          onClick={handleSendMessage}
          className="rounded-xl bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}