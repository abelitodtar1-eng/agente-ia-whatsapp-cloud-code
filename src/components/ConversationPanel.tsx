"use client";
import { useState, useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ModeToggle } from "./ModeToggle";

interface Message {
  id: number;
  role: "user" | "assistant" | "human";
  content: string;
  created_at: number;
}

interface Appointment {
  id: number;
  service: string;
  professional: string | null;
  starts_at: number;
  status: "confirmed" | "cancelled" | "pending";
}

interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
}

interface ConversationPanelProps {
  conversation: Conversation;
  onModeChange: (mode: "AI" | "HUMAN") => void;
  onDelete: () => void;
}

export function ConversationPanel({ conversation, onModeChange, onDelete }: ConversationPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const mode = conversation.mode;
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadAppointments();
  }, [conversation.id]);

  useEffect(() => {
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    const res = await fetch(`/api/messages/${conversation.id}`);
    if (res.ok) setMessages(await res.json());
  }

  async function loadAppointments() {
    const res = await fetch(`/api/appointments/${conversation.id}`);
    if (res.ok) setAppointments(await res.json());
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    await fetch(`/api/messages/${conversation.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input.trim() }),
    });
    setInput("");
    setSending(false);
    await loadMessages();
  }

  async function handleDelete() {
    if (!confirm(`¿Borrar la conversación con ${conversation.name ?? conversation.phone}?`)) return;
    await fetch(`/api/conversations/${conversation.id}`, { method: "DELETE" });
    onDelete();
  }

  function handleModeChange(newMode: "AI" | "HUMAN") {
    onModeChange(newMode);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {conversation.name ?? conversation.phone}
          </p>
          <p className="text-xs text-gray-400">{conversation.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAppointments(!showAppointments)}
            className="text-xs text-blue-600 hover:underline"
          >
            Citas ({appointments.filter((a) => a.status === "confirmed").length})
          </button>
          <ModeToggle conversationId={conversation.id} mode={mode} onChange={handleModeChange} />
          <button
            onClick={handleDelete}
            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded hover:bg-red-50 transition-colors"
          >
            Borrar
          </button>
        </div>
      </div>

      {showAppointments && appointments.length > 0 && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-xs font-medium text-blue-800 mb-2">Citas del paciente</p>
          <div className="space-y-1">
            {appointments.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs text-blue-700">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    a.status === "confirmed"
                      ? "bg-emerald-500"
                      : a.status === "cancelled"
                      ? "bg-red-400"
                      : "bg-amber-400"
                  }`}
                />
                <span>
                  {new Date(a.starts_at * 1000).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {a.service}
                  {a.professional ? ` · ${a.professional}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} createdAt={m.created_at} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        {mode === "AI" ? (
          <p className="text-xs text-center text-gray-400">El bot responde automáticamente</p>
        ) : (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Escribe un mensaje..."
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
