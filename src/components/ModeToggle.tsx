"use client";

const TEAL = "#00d4aa"; const YELL = "#ffd166";

interface ModeToggleProps {
  conversationId: number;
  mode: "AI" | "HUMAN";
  onChange: (mode: "AI" | "HUMAN") => void;
}

export function ModeToggle({ conversationId, mode, onChange }: ModeToggleProps) {
  async function toggle() {
    const next = mode === "AI" ? "HUMAN" : "AI";
    await fetch(`/api/mode/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
    onChange(next);
  }

  return (
    <button
      onClick={toggle}
      style={{
        padding: "4px 12px", fontSize: 11, fontWeight: 600, borderRadius: 20, border: "none", cursor: "pointer",
        background: mode === "AI" ? "rgba(0,212,170,.15)" : "rgba(255,209,102,.15)",
        color: mode === "AI" ? TEAL : YELL,
        transition: "all .15s",
      }}
    >
      {mode === "AI" ? "IA" : "HUMAN"}
    </button>
  );
}
