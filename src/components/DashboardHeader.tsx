"use client";
import { SystemPromptEditor } from "./SystemPromptEditor";

const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const TEAL = "#00d4aa"; const YELL = "#ffd166"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";

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

export function DashboardHeader({ phone, onDisconnect, selectedConversation, onModeChange }: DashboardHeaderProps) {
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
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: CARD, borderBottom: `1px solid ${BORD}`, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: TEAL }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>CRM DTAR</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <SystemPromptEditor />
        {selectedConversation && (
          <button
            onClick={handleModeToggle}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", fontSize: 11, fontWeight: 600, borderRadius: 20,
              border: "none", cursor: "pointer",
              background: selectedConversation.mode === "AI" ? "rgba(0,212,170,.15)" : "rgba(255,209,102,.15)",
              color: selectedConversation.mode === "AI" ? TEAL : YELL,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: selectedConversation.mode === "AI" ? TEAL : YELL }} />
            {selectedConversation.mode === "AI" ? "IA activo" : "Modo humano"}
          </button>
        )}
        {phone && <span style={{ fontSize: 11, color: MUTED }}>+{phone}</span>}
        <button
          onClick={handleDisconnect}
          style={{ padding: "5px 14px", fontSize: 11, background: "transparent", border: `1px solid ${BORD}`, color: MUTED, borderRadius: 8, cursor: "pointer" }}
        >
          Desconectar
        </button>
      </div>
    </header>
  );
}
