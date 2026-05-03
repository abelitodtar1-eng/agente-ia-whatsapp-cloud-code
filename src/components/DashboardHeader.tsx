"use client";
import { SystemPromptEditor } from "./SystemPromptEditor";

interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
}

interface DashboardHeaderProps {
  phone: string | null;
  onDisconnect: () => void;
  selectedConversation: Conversation | null;
  onModeChange: (mode: "AI" | "HUMAN") => void;
}

export function DashboardHeader({
  phone,
  onDisconnect,
  selectedConversation,
  onModeChange,
}: DashboardHeaderProps) {
  async function handleDisconnect() {
    if (!confirm("¿Desconectar el número de WhatsApp?")) return;
    await fetch("/api/connection/disconnect", { method: "POST" });
    onDisconnect();
  }

  async function handleModeToggle() {
    if (!selectedConversation) return;
    const next = selectedConversation.mode === "AI" ? "HUMAN" : "AI";
    await fetch(`/api/mode/${selectedConversation.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
    onModeChange(next);
  }

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-sm font-semibold text-gray-900">IA Founders</span>
        <span className="text-xs text-gray-400">· Clínica Dental Sonríe Bien</span>
      </div>
      <div className="flex items-center gap-3">
        <SystemPromptEditor />
        {selectedConversation && (
          <button
            onClick={handleModeToggle}
            title={
              selectedConversation.mode === "AI"
                ? "El agente está activo — clic para que responda el humano"
                : "Modo humano activo — clic para activar el agente"
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              selectedConversation.mode === "AI"
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                selectedConversation.mode === "AI" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {selectedConversation.mode === "AI" ? "Agente activo" : "Modo humano"}
          </button>
        )}
        {phone && <span className="text-xs text-gray-500">+{phone}</span>}
        <button
          onClick={handleDisconnect}
          className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors"
        >
          Desconectar
        </button>
      </div>
    </header>
  );
}
