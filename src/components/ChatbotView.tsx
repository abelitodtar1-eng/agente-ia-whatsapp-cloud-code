"use client";
import { useState, useEffect, useRef } from "react";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const TEAL = "#00d4aa"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";

interface Msg {
  role: "user" | "bot" | "error";
  content: string;
}

function genSessionId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function ChatbotView() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(() => {
    if (typeof window === "undefined") return genSessionId();
    const stored = sessionStorage.getItem("dtar_chat_session");
    if (stored) return stored;
    const id = genSessionId();
    sessionStorage.setItem("dtar_chat_session", id);
    return id;
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });
      const data = await res.json() as { response?: string; error?: string };
      if (res.ok && data.response) {
        setMessages((prev) => [...prev, { role: "bot", content: data.response! }]);
      } else {
        setMessages((prev) => [...prev, { role: "error", content: data.error ?? "Error desconocido" }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "error", content: `Sin conexión: ${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      setSending(false);
    }
  }

  function clearChat() {
    setMessages([]);
    sessionStorage.removeItem("dtar_chat_session");
    const id = genSessionId();
    sessionStorage.setItem("dtar_chat_session", id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: BG, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: CARD, borderBottom: `1px solid ${BORD}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: TEAL }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Asistente IA</span>
            <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>· mismo bot que WhatsApp</span>
          </div>
        </div>
        <button
          onClick={clearChat}
          style={{ fontSize: 11, color: MUTED, background: "transparent", border: `1px solid ${BORD}`, padding: "4px 12px", borderRadius: 8, cursor: "pointer" }}
        >
          Nueva sesión
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, opacity: .5 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `rgba(108,99,255,.2)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>💬</div>
            <p style={{ fontSize: 13, color: MUTED, textAlign: "center" }}>Escribe un mensaje para empezar la conversación con el bot</p>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === "user") {
            return (
              <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ maxWidth: "75%" }}>
                  <div style={{ background: PRP, borderRadius: "16px 16px 4px 16px", padding: "10px 14px" }}>
                    <p style={{ fontSize: 13, color: "#fff", whiteSpace: "pre-wrap", margin: 0 }}>{m.content}</p>
                  </div>
                </div>
              </div>
            );
          }
          if (m.role === "bot") {
            return (
              <div key={i} style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ maxWidth: "75%" }}>
                  <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: "16px 16px 16px 4px", padding: "10px 14px" }}>
                    <p style={{ fontSize: 13, color: TEXT, whiteSpace: "pre-wrap", margin: 0 }}>{m.content}</p>
                  </div>
                  <p style={{ fontSize: 10, color: MUTED, marginTop: 3, marginLeft: 4 }}>Bot</p>
                </div>
              </div>
            );
          }
          return (
            <div key={i} style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ background: "rgba(255,107,107,.1)", border: "1px solid rgba(255,107,107,.2)", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#ff6b6b", maxWidth: "80%" }}>
                ⚠ {m.content}
              </div>
            </div>
          );
        })}

        {sending && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: "16px 16px 16px 4px", padding: "12px 16px", display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 1, 2].map((n) => (
                <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: MUTED, animation: `bounce 1.2s ease-in-out ${n * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORD}`, background: CARD, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Escribe un mensaje..."
            disabled={sending}
            style={{
              flex: 1, fontSize: 13, background: BG, border: `1px solid ${BORD}`,
              borderRadius: 8, padding: "10px 14px", color: TEXT, outline: "none",
              opacity: sending ? .6 : 1,
            }}
            onFocus={(e) => { e.target.style.borderColor = PRP; }}
            onBlur={(e) => { e.target.style.borderColor = BORD; }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none",
              background: PRP, color: "#fff",
              cursor: (!input.trim() || sending) ? "not-allowed" : "pointer",
              opacity: (!input.trim() || sending) ? .5 : 1, transition: "opacity .15s",
            }}
          >
            {sending ? "..." : "Enviar"}
          </button>
        </div>
        <p style={{ fontSize: 10, color: MUTED, marginTop: 6, textAlign: "center" }}>
          Sesión: <code style={{ fontFamily: "monospace", opacity: .6 }}>{sessionId}</code>
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
