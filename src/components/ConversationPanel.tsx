"use client";
import { useState, useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ModeToggle } from "./ModeToggle";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";

interface Message {
  id: number;
  role: "user" | "assistant" | "human";
  content: string;
  created_at: number;
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
  const mode = conversation.mode;
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadMessages(); }, [conversation.id]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: BG }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${BORD}`, background: CARD, flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{conversation.name ?? conversation.phone}</p>
          <p style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{conversation.phone}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ModeToggle conversationId={conversation.id} mode={mode} onChange={onModeChange} />
          <button
            onClick={handleDelete}
            style={{ fontSize: 11, color: RED, background: "transparent", border: `1px solid rgba(255,107,107,.25)`, padding: "4px 12px", borderRadius: 8, cursor: "pointer" }}
          >
            Borrar
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: BG }}>
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} createdAt={m.created_at} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORD}`, background: CARD, flexShrink: 0 }}>
        {mode === "AI" ? (
          <p style={{ fontSize: 11, color: MUTED, textAlign: "center" }}>El bot responde automáticamente</p>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Escribe un mensaje..."
              style={{
                flex: 1, fontSize: 13, background: BG, border: `1px solid ${BORD}`,
                borderRadius: 8, padding: "9px 12px", color: TEXT, outline: "none",
              }}
              onFocus={(e) => { e.target.style.borderColor = PRP; }}
              onBlur={(e) => { e.target.style.borderColor = BORD; }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              style={{
                padding: "9px 18px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none",
                background: PRP, color: "#fff", cursor: sending ? "not-allowed" : "pointer",
                opacity: (!input.trim() || sending) ? .5 : 1, transition: "opacity .15s",
              }}
            >
              Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
