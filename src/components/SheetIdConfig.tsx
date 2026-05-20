"use client";
import { useState, useEffect } from "react";

const BG   = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e";
const TEAL = "#00d4aa"; const RED  = "#ff6b6b"; const TEXT = "#e2e8f0";

interface Props {
  endpoint?: string;
  label?: string;
}

export function SheetIdConfig({ endpoint = "/api/settings/sheet", label = "Google Sheet — Fuente de datos" }: Props) {
  const [sheetId, setSheetId] = useState("");
  const [saved,   setSaved]   = useState("");
  const [status,  setStatus]  = useState<"idle"|"saving"|"ok"|"error">("idle");
  const [msg,     setMsg]     = useState("");

  useEffect(() => {
    fetch(endpoint)
      .then(r => r.ok ? r.json() : null)
      .then((d: { sheetId: string } | null) => {
        if (!d) return;
        setSheetId(d.sheetId ?? ""); setSaved(d.sheetId ?? "");
      })
      .catch(() => {});
  }, [endpoint]);

  function extractId(raw: string): string {
    const m = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : raw.trim();
  }

  async function save() {
    const cleanId = extractId(sheetId);
    if (cleanId !== sheetId) setSheetId(cleanId);
    setStatus("saving"); setMsg("");
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sheetId: cleanId }) });
      if (!res.ok) { setStatus("error"); setMsg(`Error ${res.status}`); return; }
      const d = await res.json() as { ok?: boolean; error?: string };
      if (d.ok) { setSaved(cleanId); setStatus("ok"); setMsg("Guardado"); }
      else { setStatus("error"); setMsg(d.error ?? "Error"); }
    } catch (e) { setStatus("error"); setMsg(e instanceof Error ? e.message : "Error"); }
  }

  const dirty = sheetId !== saved;

  return (
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 10, padding: "14px 18px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>📊</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{label}</span>
        <span style={{ fontSize: 10, color: TEAL, background: "rgba(0,212,170,.1)", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>ID</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={sheetId}
          onChange={e => { setSheetId(e.target.value); setStatus("idle"); setMsg(""); }}
          placeholder="ID del Google Spreadsheet"
          style={{ flex: 1, background: BG, border: `1px solid ${dirty ? "#ffd166" : BORD}`, borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 12, fontFamily: "monospace", outline: "none" }}
          onFocus={e => { e.target.style.borderColor = TEAL; }}
          onBlur={e => { e.target.style.borderColor = dirty ? "#ffd166" : BORD; }}
        />
        <button
          onClick={save}
          disabled={!sheetId.trim() || status === "saving"}
          style={{ padding: "9px 18px", fontSize: 12, fontWeight: 600, background: TEAL, color: "#0a0c10", border: "none", borderRadius: 8, cursor: (!sheetId.trim() || status === "saving") ? "not-allowed" : "pointer", opacity: (!sheetId.trim() || status === "saving") ? .5 : 1, whiteSpace: "nowrap" }}
        >
          {status === "saving" ? "..." : "Guardar"}
        </button>
      </div>
      {dirty && <p style={{ fontSize: 11, color: "#ffd166", marginTop: 5 }}>⚠ Cambios sin guardar</p>}
      {msg && <p style={{ fontSize: 11, color: status === "ok" ? TEAL : RED, marginTop: 6 }}>{msg}</p>}
    </div>
  );
}
