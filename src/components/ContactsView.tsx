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
}

function relativeTime(ts: number | null): string {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

type EditField = "name" | "phone_alias";

function EditableCell({
  value,
  placeholder,
  onSave,
}: {
  value: string | null;
  placeholder: string;
  onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  function start() {
    setDraft(value ?? "");
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={save}
          className="w-full px-2 py-1 text-sm border border-blue-400 rounded outline-none focus:ring-1 focus:ring-blue-500"
          placeholder={placeholder}
        />
        {saving && (
          <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
        )}
      </div>
    );
  }

  return (
    <button onClick={start} className="group flex items-center gap-1.5 text-left w-full">
      <span className={value ? "text-gray-900 font-medium" : "text-gray-400 italic"}>
        {value ?? placeholder}
      </span>
      <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  );
}

export function ContactsView({ conversations, onNameUpdated, onPhoneAliasUpdated }: ContactsViewProps) {
  async function saveName(id: number, name: string) {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    onNameUpdated(id, name);
  }

  async function savePhoneAlias(id: number, phone_alias: string) {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_alias }),
    });
    onPhoneAliasUpdated(id, phone_alias);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-semibold text-gray-700">
          Contactos · {conversations.length}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">Haz clic en un campo para editarlo</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-2 text-xs font-medium text-gray-500 w-48">Nombre</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-44">Teléfono</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-36">ID interno</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Modo</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Último msg</th>
            </tr>
          </thead>
          <tbody>
            {conversations.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-xs text-gray-400">
                  Sin contactos aún
                </td>
              </tr>
            )}
            {conversations.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-2.5">
                  <EditableCell
                    value={c.name}
                    placeholder="Sin nombre"
                    onSave={(v) => saveName(c.id, v)}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <EditableCell
                    value={c.phone_alias}
                    placeholder="+53..."
                    onSave={(v) => savePhoneAlias(c.id, v)}
                  />
                </td>
                <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{c.phone}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    c.mode === "AI"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {c.mode === "AI" ? "IA" : "Humano"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-400">{relativeTime(c.last_message_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
