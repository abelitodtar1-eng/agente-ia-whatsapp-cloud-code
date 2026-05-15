"use client";
import { useState, useEffect, useRef } from "react";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const TEAL = "#00d4aa"; const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";
const YELL = "#ffd166";

export function SystemPromptEditor() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings/system-prompt")
      .then((r) => r.json())
      .then((data: { text: string; updatedAt: number }) => {
        setText(data.text);
        setSavedText(data.text);
        if (data.updatedAt) {
          setLastSaved(new Date(data.updatedAt * 1000).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }));
        }
      });
  }, [open]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text, open]);

  const hasChanges = text !== savedText;

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/settings/system-prompt", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { const data = await res.json(); setError(data.error ?? "Error al guardar."); return; }
      setSavedText(text);
      setLastSaved(new Date().toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }));
    } catch { setError("Error de conexión al guardar."); }
    finally { setSaving(false); }
  }

  function handleReset() {
    if (!confirm("¿Descartar cambios y volver al texto guardado?")) return;
    setText(savedText); setError(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ padding: "5px 14px", fontSize: 11, fontWeight: 600, background: "transparent", border: `1px solid rgba(0,212,170,.4)`, color: TEAL, borderRadius: 8, cursor: "pointer" }}
      >
        Prompt IA
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 40 }} onClick={() => !hasChanges && setOpen(false)} />
      )}

      {open && (
        <div style={{ position: "fixed", top: 0, right: 0, height: "100%", width: "100%", maxWidth: 680, background: CARD, boxShadow: "-4px 0 40px rgba(0,0,0,.5)", zIndex: 50, display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${BORD}` }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>System Prompt del bot</h2>
              {lastSaved && <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Último guardado: {lastSaved}</p>}
            </div>
            <button onClick={() => { if (hasChanges && !confirm("Tienes cambios sin guardar. ¿Cerrar de todos modos?")) return; setOpen(false); }}
              style={{ background: "transparent", border: "none", color: MUTED, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>

          {/* Info box */}
          <div style={{ margin: "16px 20px 0", padding: "12px 16px", background: "rgba(108,99,255,.08)", border: `1px solid rgba(108,99,255,.2)`, borderRadius: 8, fontSize: 11, color: MUTED, lineHeight: 1.7 }}>
            <strong style={{ color: TEXT }}>Agente de triage:</strong> este prompt define cuándo el bot maneja el mensaje y cuándo escala a un humano.<br />
            Respuesta esperada: <code style={{ background: "rgba(255,255,255,.06)", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>{"{"}"action":"handle"{"}"}</code> o <code style={{ background: "rgba(255,255,255,.06)", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>{"{"}"action":"escalate"{"}"}</code><br />
            Los cambios se aplican al instante — no hace falta reiniciar.
          </div>

          {/* Textarea */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); setError(null); }}
              style={{ width: "100%", minHeight: 400, fontSize: 13, fontFamily: "monospace", color: TEXT, background: BG, border: `1px solid ${BORD}`, borderRadius: 8, padding: "12px 14px", resize: "none", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }}
              placeholder="Escribe aquí las instrucciones del bot..."
              spellCheck={false}
              onFocus={(e) => { e.target.style.borderColor = PRP; }}
              onBlur={(e) => { e.target.style.borderColor = BORD; }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: text.length > 7500 ? YELL : MUTED }}>{text.length.toLocaleString()} / 8.000 caracteres</span>
              {hasChanges && <span style={{ fontSize: 11, color: YELL, fontWeight: 600 }}>Cambios sin guardar</span>}
            </div>
            {error && <p style={{ marginTop: 8, fontSize: 12, color: RED }}>{error}</p>}
          </div>

          {/* Footer */}
          <div style={{ padding: "14px 20px", borderTop: `1px solid ${BORD}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <button onClick={handleReset} disabled={!hasChanges || saving}
              style={{ fontSize: 13, background: "transparent", border: "none", color: MUTED, cursor: (!hasChanges || saving) ? "not-allowed" : "pointer", opacity: (!hasChanges || saving) ? .4 : 1 }}>
              Descartar cambios
            </button>
            <button onClick={handleSave} disabled={!hasChanges || saving || text.length > 8000}
              style={{ padding: "9px 24px", fontSize: 13, fontWeight: 600, background: TEAL, color: "#0a0c10", border: "none", borderRadius: 8, cursor: (!hasChanges || saving || text.length > 8000) ? "not-allowed" : "pointer", opacity: (!hasChanges || saving || text.length > 8000) ? .5 : 1 }}>
              {saving ? "Guardando..." : "Guardar y aplicar"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
