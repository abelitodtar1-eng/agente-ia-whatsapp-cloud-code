"use client";
import { useState, useEffect } from "react";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const TEAL = "#00d4aa"; const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";
const YELL = "#ffd166";

function tagColor(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff;
  return `hsl(${h % 360}, 60%, 55%)`;
}

interface Conversation {
  id: number;
  phone: string;
  phone_alias: string | null;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
}

interface ContactsViewProps {
  conversations: Conversation[];
  onNameUpdated: (id: number, name: string) => void;
  onPhoneAliasUpdated: (id: number, alias: string) => void;
  onDeleted: (id: number) => void;
}

function relativeTime(ts: number | null): string {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function EditModal({ contact, onSave, onClose }: { contact: Conversation; onSave: (name: string, alias: string) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(contact.name ?? "");
  const [phoneAlias, setPhoneAlias] = useState(contact.phone_alias ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(name, phoneAlias);
    setSaving(false);
    onClose();
  }

  const inputStyle = { width: "100%", background: BG, border: `1px solid ${BORD}`, borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, padding: "24px 28px", width: "100%", maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Editar contacto</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: MUTED, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Nombre</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} placeholder="Nombre del contacto" style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = PRP; }} onBlur={(e) => { e.target.style.borderColor = BORD; }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Teléfono</label>
          <input value={phoneAlias} onChange={(e) => setPhoneAlias(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} placeholder="+53..." style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = PRP; }} onBlur={(e) => { e.target.style.borderColor = BORD; }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>ID interno (WhatsApp)</label>
          <input value={contact.phone} disabled style={{ ...inputStyle, opacity: .5, cursor: "not-allowed", fontFamily: "monospace" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "9px", fontSize: 13, fontWeight: 600, background: PRP, color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .6 : 1 }}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", fontSize: 13, fontWeight: 600, background: "transparent", color: MUTED, border: `1px solid ${BORD}`, borderRadius: 8, cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContactsView({ conversations, onNameUpdated, onPhoneAliasUpdated, onDeleted }: ContactsViewProps) {
  const [editing, setEditing] = useState<Conversation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [tagsMap, setTagsMap] = useState<Record<number, string[]>>({});

  useEffect(() => {
    if (conversations.length === 0) return;
    Promise.all(
      conversations.map(c =>
        fetch(`/api/conversations/${c.id}/tags`).then(r => r.ok ? r.json() : []).then((tags: string[]) => ({ id: c.id, tags }))
      )
    ).then(results => {
      const map: Record<number, string[]> = {};
      results.forEach(r => { map[r.id] = r.tags; });
      setTagsMap(map);
    });
  }, [conversations]);

  async function handleSaveEdit(name: string, phoneAlias: string) {
    if (!editing) return;
    await fetch(`/api/conversations/${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone_alias: phoneAlias }),
    });
    onNameUpdated(editing.id, name);
    onPhoneAliasUpdated(editing.id, phoneAlias);
  }

  async function handleDelete(id: number) {
    setDeleting(id);
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setDeleting(null); setConfirmDelete(null);
    onDeleted(id);
  }

  const thStyle = { padding: "10px 16px", textAlign: "left" as const, fontSize: 10, color: MUTED, textTransform: "uppercase" as const, letterSpacing: ".5px", fontWeight: 600 };
  const tdStyle = { padding: "12px 16px", borderBottom: `1px solid ${BORD}` };

  return (
    <>
      {editing && <EditModal contact={editing} onSave={handleSaveEdit} onClose={() => setEditing(null)} />}

      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: BG, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORD}`, background: CARD }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Contactos · <span style={{ color: MUTED }}>{conversations.length}</span></h2>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, background: CARD, borderBottom: `1px solid ${BORD}` }}>
              <tr>
                {["Nombre", "Teléfono", "ID interno", "Etiquetas", "Modo", "Último msg", ""].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conversations.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center", fontSize: 12, color: MUTED }}>Sin contactos aún</td></tr>
              )}
              {conversations.map((c) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${BORD}` }}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: c.name ? 600 : 400, color: c.name ? TEXT : MUTED, fontStyle: c.name ? "normal" : "italic" }}>
                      {c.name ?? "Sin nombre"}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: TEXT }}>{c.phone_alias ?? <span style={{ color: MUTED }}>—</span>}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11, color: MUTED }}>{c.phone}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {(tagsMap[c.id] ?? []).map(tag => (
                        <span key={tag} style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 10, background: `${tagColor(tag)}22`, color: tagColor(tag), border: `1px solid ${tagColor(tag)}55` }}>
                          {tag}
                        </span>
                      ))}
                      {!(tagsMap[c.id]?.length) && <span style={{ fontSize: 10, color: MUTED }}>—</span>}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 10, padding: "2px 10px", borderRadius: 20, fontWeight: 700, background: c.mode === "AI" ? "rgba(0,212,170,.12)" : "rgba(255,209,102,.12)", color: c.mode === "AI" ? TEAL : YELL }}>
                      {c.mode === "AI" ? "IA" : "Humano"}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11, color: MUTED }}>{relativeTime(c.last_message_at)}</td>
                  <td style={tdStyle}>
                    {confirmDelete === c.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} style={{ padding: "4px 12px", fontSize: 11, fontWeight: 600, background: RED, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", opacity: deleting === c.id ? .5 : 1 }}>
                          {deleting === c.id ? "..." : "Sí"}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} style={{ padding: "4px 12px", fontSize: 11, background: "transparent", color: MUTED, border: `1px solid ${BORD}`, borderRadius: 6, cursor: "pointer" }}>No</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setEditing(c)} title="Editar" style={{ padding: "4px 12px", fontSize: 11, background: "transparent", color: MUTED, border: `1px solid ${BORD}`, borderRadius: 6, cursor: "pointer" }}>Editar</button>
                        <button onClick={() => setConfirmDelete(c.id)} title="Eliminar" style={{ padding: "4px 12px", fontSize: 11, background: "transparent", color: RED, border: "1px solid rgba(255,107,107,.2)", borderRadius: 6, cursor: "pointer" }}>Eliminar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
