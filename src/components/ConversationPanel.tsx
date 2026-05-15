"use client";
import { useState, useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ModeToggle } from "./ModeToggle";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4"; const TEAL = "#00d4aa";

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

interface Payment {
  id: number;
  transaction_uuid: string;
  amount: number;
  description: string;
  status: "pending" | "completed" | "cancelled" | "failed";
  link_confirm: string | null;
  created_at: number;
}

function PayModal({ conversationId, onClose, onCreated }: { conversationId: number; onClose: () => void; onCreated: (p: Payment) => void }) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    const n = parseFloat(amount.replace(",", "."));
    if (!n || n <= 0 || !desc.trim()) { setErr("Monto y descripción requeridos"); return; }
    setLoading(true); setErr("");
    const res = await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId, amount: n, description: desc }) });
    const data = await res.json() as Payment & { error?: string };
    if (res.ok) { onCreated(data); onClose(); }
    else { setErr(data.error ?? "Error al crear pago"); setLoading(false); }
  }

  const inp = { width: "100%", background: BG, border: `1px solid ${BORD}`, borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={onClose}>
      <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, padding: "24px 28px", width: "100%", maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>💳 Cobrar con Enzona</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: MUTED, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Monto (CUP)</label>
          <input autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="100.00" style={inp}
            onFocus={e => { e.target.style.borderColor = TEAL; }} onBlur={e => { e.target.style.borderColor = BORD; }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Concepto</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Servicio / producto" style={inp}
            onFocus={e => { e.target.style.borderColor = TEAL; }} onBlur={e => { e.target.style.borderColor = BORD; }} />
        </div>
        {err && <p style={{ fontSize: 12, color: RED, marginBottom: 12 }}>{err}</p>}
        <p style={{ fontSize: 11, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>Se enviará el link de pago Enzona al cliente por WhatsApp.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={submit} disabled={loading} style={{ flex: 1, padding: "9px", fontSize: 13, fontWeight: 600, background: TEAL, color: "#0a0c10", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .6 : 1 }}>
            {loading ? "Creando..." : "Generar cobro"}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", fontSize: 13, background: "transparent", color: MUTED, border: `1px solid ${BORD}`, borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export function ConversationPanel({ conversation, onModeChange, onDelete }: ConversationPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const mode = conversation.mode;
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadPayments();
  }, [conversation.id]);

  async function loadPayments() {
    const res = await fetch(`/api/payments/${conversation.id}`);
    if (res.ok) setPayments(await res.json());
  }

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

  const statusColor = { pending: "#ffd166", completed: TEAL, cancelled: MUTED, failed: RED } as const;
  const statusLabel = { pending: "Pendiente", completed: "Completado", cancelled: "Cancelado", failed: "Fallido" } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: BG }}>
      {showPayModal && (
        <PayModal conversationId={conversation.id} onClose={() => setShowPayModal(false)} onCreated={(p) => { setPayments(prev => [p, ...prev]); }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${BORD}`, background: CARD, flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{conversation.name ?? conversation.phone}</p>
          <p style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{conversation.phone}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setShowPayModal(true)}
            style={{ fontSize: 11, fontWeight: 600, color: TEAL, background: "rgba(0,212,170,.1)", border: `1px solid rgba(0,212,170,.3)`, padding: "4px 12px", borderRadius: 8, cursor: "pointer" }}
          >
            💳 Cobrar
          </button>
          <ModeToggle conversationId={conversation.id} mode={mode} onChange={onModeChange} />
          <button
            onClick={handleDelete}
            style={{ fontSize: 11, color: RED, background: "transparent", border: `1px solid rgba(255,107,107,.25)`, padding: "4px 12px", borderRadius: 8, cursor: "pointer" }}
          >
            Borrar
          </button>
        </div>
      </div>

      {/* Payments strip */}
      {payments.length > 0 && (
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${BORD}`, background: "#12141e", display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
          {payments.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, background: CARD, border: `1px solid ${BORD}`, borderRadius: 8, padding: "4px 10px", fontSize: 11 }}>
              <span style={{ color: statusColor[p.status], fontWeight: 700 }}>●</span>
              <span style={{ color: TEXT }}>{p.description}</span>
              <span style={{ color: MUTED }}>·</span>
              <span style={{ color: TEXT, fontWeight: 600 }}>{p.amount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CUP</span>
              <span style={{ color: statusColor[p.status] }}>{statusLabel[p.status]}</span>
              {p.status === "pending" && p.link_confirm && (
                <a href={p.link_confirm} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: PRP, marginLeft: 2 }}>ver link</a>
              )}
            </div>
          ))}
        </div>
      )}

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
