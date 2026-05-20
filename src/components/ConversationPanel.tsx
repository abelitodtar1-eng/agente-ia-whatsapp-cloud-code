"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageBubble } from "./MessageBubble";
import { ModeToggle } from "./ModeToggle";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4"; const TEAL = "#00d4aa";
const YELL = "#ffd166";

const PRESET_TAGS = ["mayorista", "minorista", "vip", "inactivo", "nuevo"];

function tagColor(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff;
  return `hsl(${h % 360}, 60%, 55%)`;
}

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

interface Note {
  id: number;
  username_snapshot: string;
  content: string;
  created_at: number;
}

interface QuickReply {
  id: number;
  title: string;
  content: string;
  category: string;
}

function relTime(ts: number): string {
  const d = Math.floor(Date.now() / 1000) - ts;
  if (d < 60) return "ahora";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return new Date(ts * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function ConversationPanel({ conversation, onModeChange, onDelete }: ConversationPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const mode = conversation.mode;
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  // Notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteInput, setNoteInput] = useState("");

  // Quick replies
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [qrSearch, setQrSearch] = useState("");
  const [showQr, setShowQr] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    loadPayments();
    loadNotes();
    loadTags();
    if (quickReplies.length === 0) loadQuickReplies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  async function loadPayments() {
    const res = await fetch(`/api/payments/${conversation.id}`);
    if (res.ok) setPayments(await res.json());
  }

  async function loadTags() {
    const res = await fetch(`/api/conversations/${conversation.id}/tags`);
    if (res.ok) setTags(await res.json());
  }

  async function handleAddTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    await fetch(`/api/conversations/${conversation.id}/tags`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: t }),
    });
    setTags(prev => [...prev, t].sort());
    setTagInput("");
  }

  async function handleRemoveTag(tag: string) {
    await fetch(`/api/conversations/${conversation.id}/tags`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
    setTags(prev => prev.filter(t => t !== tag));
  }

  async function loadNotes() {
    const res = await fetch(`/api/conversations/${conversation.id}/notes`);
    if (res.ok) setNotes(await res.json());
  }

  async function loadQuickReplies() {
    const res = await fetch("/api/quick-replies");
    if (res.ok) setQuickReplies(await res.json());
  }

  async function addNote() {
    if (!noteInput.trim()) return;
    const res = await fetch(`/api/conversations/${conversation.id}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteInput.trim() }),
    });
    if (res.ok) { setNoteInput(""); await loadNotes(); }
  }

  async function deleteNoteById(noteId: number) {
    await fetch(`/api/conversations/${conversation.id}/notes`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    });
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }

  const filteredQr = useCallback(() => {
    if (!qrSearch) return quickReplies;
    const q = qrSearch.toLowerCase();
    return quickReplies.filter(r => r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q));
  }, [quickReplies, qrSearch]);

  function applyQuickReply(qr: QuickReply) {
    const name = conversation.name ?? conversation.phone;
    const text = qr.content.replace(/\{nombre\}/g, name);
    setInput(text);
    setShowQr(false);
    setQrSearch("");
    setTimeout(() => inputRef.current?.focus(), 50);
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
      <div style={{ borderBottom: `1px solid ${BORD}`, background: CARD, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
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

        {/* Tags row */}
        <div style={{ padding: "4px 16px 8px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {tags.map(tag => (
            <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: `${tagColor(tag)}22`, color: tagColor(tag), border: `1px solid ${tagColor(tag)}55` }}>
              {tag}
              <button onClick={() => handleRemoveTag(tag)} style={{ background: "transparent", border: "none", color: tagColor(tag), cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0, opacity: .7 }}>×</button>
            </span>
          ))}
          {showTagInput ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                autoFocus
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { handleAddTag(tagInput); setShowTagInput(false); }
                  if (e.key === "Escape") { setShowTagInput(false); setTagInput(""); }
                }}
                placeholder="etiqueta..."
                style={{ fontSize: 11, background: BG, border: `1px solid ${BORD}`, borderRadius: 6, padding: "2px 8px", color: TEXT, outline: "none", width: 100 }}
              />
              {PRESET_TAGS.filter(p => !tags.includes(p)).map(p => (
                <button key={p} onClick={() => { handleAddTag(p); setShowTagInput(false); }}
                  style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, border: `1px solid ${BORD}`, background: "transparent", color: MUTED, cursor: "pointer" }}>
                  {p}
                </button>
              ))}
            </div>
          ) : (
            <button onClick={() => setShowTagInput(true)} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, border: `1px dashed ${BORD}`, background: "transparent", color: MUTED, cursor: "pointer" }}>+ etiqueta</button>
          )}
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

      {/* Notes panel */}
      <div style={{ borderBottom: `1px solid ${BORD}`, background: "rgba(255,209,102,.04)", flexShrink: 0 }}>
        <button
          onClick={() => setNotesOpen(o => !o)}
          style={{ width: "100%", textAlign: "left", padding: "6px 16px", fontSize: 11, fontWeight: 600, color: YELL, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          📝 Notas internas {notes.length > 0 && <span style={{ background: YELL, color: "#0a0c10", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{notes.length}</span>}
          <span style={{ marginLeft: "auto", color: MUTED, fontWeight: 400 }}>{notesOpen ? "▲" : "▼"}</span>
        </button>
        {notesOpen && (
          <div style={{ padding: "0 16px 10px" }}>
            {notes.map(n => (
              <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, background: "rgba(255,209,102,.08)", border: `1px dashed rgba(255,209,102,.3)`, borderRadius: 6, padding: "6px 10px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 10, color: YELL, fontWeight: 600 }}>{n.username_snapshot}</span>
                  <span style={{ fontSize: 10, color: MUTED, marginLeft: 8 }}>{relTime(n.created_at)}</span>
                  <p style={{ fontSize: 12, color: TEXT, marginTop: 3, wordBreak: "break-word" }}>{n.content}</p>
                </div>
                <button onClick={() => deleteNoteById(n.id)} style={{ fontSize: 14, color: MUTED, background: "transparent", cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <input
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addNote()}
                placeholder="Añadir nota interna..."
                style={{ flex: 1, fontSize: 12, background: BG, border: `1px solid rgba(255,209,102,.3)`, borderRadius: 6, padding: "6px 10px", color: TEXT, outline: "none" }}
              />
              <button onClick={addNote} disabled={!noteInput.trim()} style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", background: YELL, color: "#0a0c10", borderRadius: 6, cursor: "pointer", opacity: noteInput.trim() ? 1 : .5 }}>+</button>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: BG }}>
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} createdAt={m.created_at} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORD}`, background: CARD, flexShrink: 0, position: "relative" }}>
        {mode === "AI" ? (
          <p style={{ fontSize: 11, color: MUTED, textAlign: "center" }}>El bot responde automáticamente</p>
        ) : (
          <>
            {/* Quick replies overlay */}
            {showQr && (
              <div style={{ position: "absolute", bottom: "100%", left: 16, right: 16, background: CARD, border: `1px solid ${BORD}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 -4px 20px rgba(0,0,0,.4)", zIndex: 100, maxHeight: 280, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "8px 12px", borderBottom: `1px solid ${BORD}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    autoFocus
                    value={qrSearch}
                    onChange={e => setQrSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === "Escape") { setShowQr(false); setQrSearch(""); } }}
                    placeholder="Buscar plantilla..."
                    style={{ flex: 1, fontSize: 12, background: BG, border: "none", color: TEXT, outline: "none" }}
                  />
                  <button onClick={() => { setShowQr(false); setQrSearch(""); }} style={{ fontSize: 16, color: MUTED, background: "transparent", cursor: "pointer" }}>×</button>
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {filteredQr().length === 0 && <p style={{ fontSize: 12, color: MUTED, padding: "12px 16px" }}>Sin resultados</p>}
                  {filteredQr().map(qr => (
                    <button
                      key={qr.id}
                      onClick={() => applyQuickReply(qr)}
                      style={{ width: "100%", textAlign: "left", padding: "9px 14px", background: "transparent", borderBottom: `1px solid ${BORD}`, cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(108,99,255,.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: PRP }}>{qr.title}</span>
                        <span style={{ fontSize: 10, color: MUTED, background: "rgba(255,255,255,.05)", padding: "1px 6px", borderRadius: 4 }}>{qr.category}</span>
                      </div>
                      <p style={{ fontSize: 11, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{qr.content}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowQr(o => !o)}
                title="Respuestas rápidas (/)"
                style={{ fontSize: 13, fontWeight: 700, padding: "9px 12px", background: showQr ? "rgba(108,99,255,.2)" : "rgba(255,255,255,.05)", border: `1px solid ${showQr ? PRP : BORD}`, borderRadius: 8, color: showQr ? PRP : MUTED, cursor: "pointer", flexShrink: 0 }}
              >
                /
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) sendMessage();
                  if (e.key === "/" && !input) { e.preventDefault(); setShowQr(true); }
                }}
                placeholder="Escribe un mensaje... (/ para plantillas)"
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
          </>
        )}
      </div>
    </div>
  );
}
