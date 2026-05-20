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

function printReceipt(content: string) {
  const now = new Date().toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const escaped = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = [
    "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Comprobante DTAR</title><style>",
    "* { margin:0; padding:0; box-sizing:border-box; }",
    "body { font-family:'Courier New',monospace; font-size:12px; padding:20px; background:#fff; color:#000; }",
    ".receipt { max-width:320px; margin:0 auto; }",
    ".header { text-align:center; border-bottom:2px dashed #000; padding-bottom:10px; margin-bottom:10px; }",
    ".header h1 { font-size:16px; font-weight:bold; letter-spacing:2px; }",
    ".header p { font-size:10px; margin-top:3px; }",
    ".label { font-size:10px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }",
    ".content { white-space:pre-wrap; line-height:1.6; padding:10px 0; border-bottom:2px dashed #000; }",
    ".footer { text-align:center; margin-top:10px; font-size:10px; }",
    "@media print { body { padding:0; } }",
    "</style></head><body>",
    "<div class='receipt'>",
    "<div class='header'><h1>DTAR CRM</h1><p>Respuesta del Asistente IA</p><p>" + now + "</p></div>",
    "<p class='label'>Contenido:</p>",
    "<div class='content'>" + escaped + "</div>",
    "<div class='footer'><p>— Sistema Interno DTAR —</p></div>",
    "</div></body></html>",
  ].join("");

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "width=420,height=600");
  if (w) {
    w.addEventListener("load", () => { w.print(); URL.revokeObjectURL(url); }, { once: true });
  } else {
    URL.revokeObjectURL(url);
  }
}

export function ChatbotView() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
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
    fetch("/api/settings/webhook")
      .then(r => r.json())
      .then((d: Record<string, string>) => { if (d.url) setWebhookUrl(d.url); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    if (!webhookUrl) {
      setMessages((prev) => [...prev, { role: "error", content: "Webhook no configurado. Configúralo en la pestaña Webhook (campo URL general)." }]);
      return;
    }
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const phone = `webchat_${sessionId}@web`;
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: text }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        setMessages((prev) => [...prev, { role: "error", content: `Webhook respondió ${res.status}${body ? `: ${body.slice(0, 80)}` : ""}` }]);
        return;
      }
      const data = await res.json() as { response?: string };
      setMessages((prev) => [...prev, { role: "bot", content: data.response ?? "Sin respuesta del bot." }]);
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
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, marginLeft: 4 }}>
                    <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>Bot</p>
                    <button
                      onClick={() => printReceipt(m.content)}
                      title="Imprimir comprobante"
                      style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, color: MUTED, display: "flex", alignItems: "center", opacity: .6 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = ".6"; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9"/>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                      </svg>
                    </button>
                  </div>
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
