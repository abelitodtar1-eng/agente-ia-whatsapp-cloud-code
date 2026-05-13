"use client";
import { useState } from "react";

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

interface EditModalProps {
  contact: Conversation;
  onSave: (name: string, phoneAlias: string) => Promise<void>;
  onClose: () => void;
}

function EditModal({ contact, onSave, onClose }: EditModalProps) {
  const [name, setName] = useState(contact.name ?? "");
  const [phoneAlias, setPhoneAlias] = useState(contact.phone_alias ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(name, phoneAlias);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Editar contacto</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Nombre del contacto"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
            <input
              value={phoneAlias}
              onChange={(e) => setPhoneAlias(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="+53..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ID interno (WhatsApp)</label>
            <input
              value={contact.phone}
              disabled
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 font-mono"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
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

  async function handleSaveEdit(name: string, phoneAlias: string) {
    if (!editing) return;
    await fetch(`/api/conversations/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone_alias: phoneAlias }),
    });
    onNameUpdated(editing.id, name);
    onPhoneAliasUpdated(editing.id, phoneAlias);
  }

  async function handleDelete(id: number) {
    setDeleting(id);
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setDeleting(null);
    setConfirmDelete(null);
    onDeleted(id);
  }

  return (
    <>
      {editing && (
        <EditModal
          contact={editing}
          onSave={handleSaveEdit}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-sm font-semibold text-gray-700">Contactos · {conversations.length}</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-2 text-xs font-medium text-gray-500 w-44">Nombre</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-36">Teléfono</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">ID interno</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-20">Modo</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-24">Último msg</th>
                <th className="px-4 py-2 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {conversations.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-xs text-gray-400">Sin contactos aún</td>
                </tr>
              )}
              {conversations.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                  <td className="px-5 py-2.5">
                    <span className={`text-sm ${c.name ? "font-medium text-gray-900" : "text-gray-400 italic"}`}>
                      {c.name ?? "Sin nombre"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700">
                    {c.phone_alias ?? <span className="text-gray-400 italic text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-400">{c.phone}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      c.mode === "AI" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {c.mode === "AI" ? "IA" : "Humano"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{relativeTime(c.last_message_at)}</td>
                  <td className="px-4 py-2.5">
                    {confirmDelete === c.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting === c.id}
                          className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          {deleting === c.id ? "..." : "Sí"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditing(c)}
                          title="Editar"
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c.id)}
                          title="Eliminar"
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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
