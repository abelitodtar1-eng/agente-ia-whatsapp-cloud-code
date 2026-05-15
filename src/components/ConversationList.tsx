"use client";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const TEAL = "#00d4aa"; const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";

interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
  unread_count: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function relativeTime(ts: number | null): string {
  if (!ts) return "";
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: CARD }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORD}` }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px" }}>
          Conversaciones
        </h2>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {conversations.length === 0 && (
          <p style={{ fontSize: 11, color: MUTED, textAlign: "center", marginTop: 32, padding: "0 16px" }}>
            Sin conversaciones aún. Esperando mensajes...
          </p>
        )}
        {conversations.map((c) => {
          const selected = selectedId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                width: "100%", textAlign: "left", padding: "12px 16px",
                borderBottom: `1px solid ${BORD}`, cursor: "pointer", display: "block",
                background: selected ? "rgba(108,99,255,.12)" : "transparent",
                borderLeft: selected ? `2px solid ${PRP}` : "2px solid transparent",
                transition: "background .15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {c.name ?? c.phone}
                  {c.unread_count > 0 && (
                    <span style={{
                      marginLeft: 6, display: "inline-flex", alignItems: "center", justifyContent: "center",
                      minWidth: 18, height: 18, padding: "0 4px", fontSize: 10, fontWeight: 700,
                      background: PRP, color: "#fff", borderRadius: 20,
                    }}>
                      {c.unread_count > 99 ? "99+" : c.unread_count}
                    </span>
                  )}
                </span>
                <span style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
                  fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
                  background: c.mode === "AI" ? "rgba(0,212,170,.12)" : "rgba(255,107,107,.12)",
                  color: c.mode === "AI" ? TEAL : RED,
                }}>
                  {c.mode === "HUMAN" && (
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: RED, display: "inline-block" }} />
                  )}
                  {c.mode === "AI" ? "IA" : "Humano"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                <span style={{ fontSize: 11, color: MUTED }}>{c.phone}</span>
                <span style={{ fontSize: 11, color: MUTED }}>{relativeTime(c.last_message_at)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
