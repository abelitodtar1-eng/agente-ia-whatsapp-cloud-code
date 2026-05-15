const PRP = "#6c63ff"; const TEAL = "#00d4aa"; const YELL = "#ffd166"; const MUTED = "#8892a4";

interface MessageBubbleProps {
  role: "user" | "assistant" | "human";
  content: string;
  createdAt: number;
}

export function MessageBubble({ role, content, createdAt }: MessageBubbleProps) {
  const time = new Date(createdAt * 1000).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  if (role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
        <div style={{ maxWidth: "75%" }}>
          <div style={{ background: "#1e2130", border: "1px solid #2a2d3e", borderRadius: "16px 16px 16px 4px", padding: "10px 14px" }}>
            <p style={{ fontSize: 13, color: "#e2e8f0", whiteSpace: "pre-wrap", margin: 0 }}>{content}</p>
          </div>
          <p style={{ fontSize: 10, color: MUTED, marginTop: 3, marginLeft: 4 }}>{time}</p>
        </div>
      </div>
    );
  }

  if (role === "assistant") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{ maxWidth: "75%" }}>
          <div style={{ background: "rgba(108,99,255,.2)", border: "1px solid rgba(108,99,255,.3)", borderRadius: "16px 16px 4px 16px", padding: "10px 14px" }}>
            <p style={{ fontSize: 13, color: "#e2e8f0", whiteSpace: "pre-wrap", margin: 0 }}>{content}</p>
          </div>
          <p style={{ fontSize: 10, color: MUTED, marginTop: 3, marginRight: 4, textAlign: "right" }}>IA · {time}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
      <div style={{ maxWidth: "75%" }}>
        <div style={{ background: "rgba(255,209,102,.15)", border: "1px solid rgba(255,209,102,.25)", borderRadius: "16px 16px 4px 16px", padding: "10px 14px" }}>
          <p style={{ fontSize: 13, color: YELL, whiteSpace: "pre-wrap", margin: 0 }}>{content}</p>
        </div>
        <p style={{ fontSize: 10, color: MUTED, marginTop: 3, marginRight: 4, textAlign: "right" }}>Tú · {time}</p>
      </div>
    </div>
  );
}
