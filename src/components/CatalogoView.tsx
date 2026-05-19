"use client";
import { useState, useEffect, useRef } from "react";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const TEAL = "#00d4aa"; const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";

interface CatalogoItem {
  id: number;
  title: string;
  description: string | null;
  filename: string;
  created_at: number;
}

function UploadForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  async function handleSubmit() {
    if (!title.trim() || !file) return;
    setStatus("uploading"); setMsg("");
    const form = new FormData();
    form.append("title", title.trim());
    form.append("description", description.trim());
    form.append("imagen", file);
    const res = await fetch("/api/catalogo", { method: "POST", body: form });
    const data = await res.json() as { error?: string };
    if (res.ok) {
      setStatus("ok"); setMsg("Guardado");
      setTitle(""); setDescription(""); setFile(null); setPreview(null);
      onCreated();
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error"); setMsg(data.error ?? "Error");
    }
  }

  const inputStyle = {
    width: "100%", background: BG, border: `1px solid ${BORD}`, borderRadius: 8,
    padding: "9px 12px", color: TEXT, fontSize: 12, outline: "none", boxSizing: "border-box" as const,
  };

  return (
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 10, padding: "18px 20px", marginBottom: 24 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 14 }}>+ Nueva promoción</p>
      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título *" style={inputStyle}
          onFocus={e => { e.target.style.borderColor = PRP; }} onBlur={e => { e.target.style.borderColor = BORD; }} />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)"
          rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          onFocus={e => { e.target.style.borderColor = PRP; }} onBlur={e => { e.target.style.borderColor = BORD; }} />

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          style={{ border: `2px dashed ${BORD}`, borderRadius: 8, padding: "20px", textAlign: "center", cursor: "pointer", background: BG, transition: "border-color .15s" }}
          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = PRP; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = BORD; }}
        >
          {preview ? (
            <img src={preview} alt="preview" style={{ maxHeight: 160, maxWidth: "100%", borderRadius: 6, objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 11, color: MUTED }}>Arrastra imagen aquí o haz clic · JPG / PNG / WEBP</span>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={handleSubmit} disabled={!title.trim() || !file || status === "uploading"}
          style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, background: PRP, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!title.trim() || !file || status === "uploading") ? .5 : 1 }}>
          {status === "uploading" ? "Subiendo..." : "Guardar"}
        </button>
        {msg && <span style={{ fontSize: 12, color: status === "ok" ? TEAL : RED }}>{msg}</span>}
      </div>
    </div>
  );
}

function ItemCard({ item, onDeleted }: { item: CatalogoItem; onDeleted: () => void }) {
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");
  const [sendOk, setSendOk] = useState<boolean | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSendEstado() {
    setSending(true); setSendMsg(""); setSendOk(null);
    const res = await fetch(`/api/catalogo/${item.id}/estado`, { method: "POST" });
    const data = await res.json() as { ok?: boolean; error?: string };
    setSending(false);
    if (data.ok) { setSendOk(true); setSendMsg("Estado publicado ✓"); }
    else { setSendOk(false); setSendMsg(data.error ?? "Error"); }
    setTimeout(() => { setSendMsg(""); setSendOk(null); }, 4000);
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${item.title}"?`)) return;
    setDeleting(true);
    await fetch(`/api/catalogo/${item.id}`, { method: "DELETE" });
    onDeleted();
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", aspectRatio: "4/3", background: BG, overflow: "hidden" }}>
        <img
          src={`/api/catalogo/${item.id}/imagen`}
          alt={item.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, margin: 0 }}>{item.title}</p>
        {item.description && (
          <p style={{ fontSize: 11, color: MUTED, margin: 0, lineHeight: 1.5 }}>{item.description}</p>
        )}
        <p style={{ fontSize: 10, color: MUTED, margin: 0, marginTop: "auto", paddingTop: 6 }}>
          {new Date(item.created_at * 1000).toLocaleDateString("es-ES")}
        </p>
      </div>
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${BORD}`, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={handleSendEstado} disabled={sending}
          style={{ flex: 1, padding: "7px 10px", fontSize: 11, fontWeight: 600, background: TEAL, color: "#0a0c10", border: "none", borderRadius: 7, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? .6 : 1 }}>
          {sending ? "Enviando..." : "📤 Estado WA"}
        </button>
        <button onClick={handleDelete} disabled={deleting}
          style={{ padding: "7px 10px", fontSize: 11, background: "transparent", color: RED, border: `1px solid rgba(255,107,107,.3)`, borderRadius: 7, cursor: "pointer", opacity: deleting ? .5 : 1 }}>
          🗑
        </button>
      </div>
      {sendMsg && (
        <div style={{ padding: "8px 14px", fontSize: 11, color: sendOk ? TEAL : RED, borderTop: `1px solid ${BORD}`, background: sendOk ? "rgba(0,212,170,.06)" : "rgba(255,107,107,.06)" }}>
          {sendMsg}
        </div>
      )}
    </div>
  );
}

export function CatalogoView() {
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/catalogo");
    if (res.ok) setItems(await res.json() as CatalogoItem[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", background: BG, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORD}`, background: CARD, flexShrink: 0 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Catálogo — Promociones</h2>
        <p style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
          Guarda imágenes de productos y publícalas como estado de WhatsApp con un clic.
        </p>
      </div>

      <div style={{ padding: "24px", maxWidth: 900, width: "100%" }}>
        <UploadForm onCreated={load} />

        {loading ? (
          <p style={{ fontSize: 12, color: MUTED }}>Cargando...</p>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: MUTED, fontSize: 12 }}>
            Sin promociones aún. Sube la primera imagen arriba.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {items.map(item => (
              <ItemCard key={item.id} item={item} onDeleted={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
