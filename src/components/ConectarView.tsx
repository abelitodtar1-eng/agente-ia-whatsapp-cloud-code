"use client";
import { useEffect, useState } from "react";

const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const TEAL = "#00d4aa"; const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";

interface ConnectionState {
  status: "disconnected" | "qr" | "connecting" | "connected" | "pairing";
  qr_string: string | null;
  phone: string | null;
}

interface ConectarViewProps {
  onConnected: (phone: string) => void;
  onDisconnected: () => void;
}

export function ConectarView({ onConnected, onDisconnected }: ConectarViewProps) {
  const [state, setState] = useState<ConnectionState>({ status: "disconnected", qr_string: null, phone: null });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/connection/status");
        const data: ConnectionState = await res.json();
        setState(data);
        setElapsed((e) => e + 2);
        if (data.status === "connected" && data.phone) onConnected(data.phone);
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [onConnected]);

  async function handleDisconnect() {
    if (!confirm("¿Desconectar el número de WhatsApp?")) return;
    await fetch("/api/connection/disconnect", { method: "POST" });
    setState({ status: "disconnected", qr_string: null, phone: null });
    onDisconnected();
  }

  if (state.status === "connected") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, padding: 40 }}>
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, padding: "36px 40px", maxWidth: 380, width: "100%", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,212,170,.12)", border: `2px solid ${TEAL}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: TEAL }} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 6 }}>WhatsApp Conectado</h2>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>+{state.phone}</p>
          <button
            onClick={handleDisconnect}
            style={{ padding: "9px 24px", fontSize: 13, background: "transparent", border: `1px solid rgba(255,107,107,.3)`, color: RED, borderRadius: 8, cursor: "pointer" }}
          >
            Desconectar
          </button>
        </div>
      </div>
    );
  }

  const dotColor = state.status === "qr" ? TEAL : state.status === "connecting" ? PRP : MUTED;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, padding: 40 }}>
      <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, padding: "36px 32px", maxWidth: 380, width: "100%", textAlign: "center" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 6 }}>Conectar WhatsApp</h2>
        <p style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>CRM DTAR · Sistema Interno</p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
          <span style={{ fontSize: 12, color: MUTED, textTransform: "capitalize" }}>{state.status}</span>
        </div>

        {state.qr_string ? (
          <div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <img src={state.qr_string} alt="QR WhatsApp" style={{ width: 220, height: 220, borderRadius: 12, border: `1px solid ${BORD}` }} />
            </div>
            <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.7 }}>
              Abre WhatsApp en tu móvil<br />
              Dispositivos vinculados → Vincular un dispositivo<br />
              Escanea el código QR
            </p>
          </div>
        ) : elapsed > 10 && state.status !== "connecting" ? (
          <div style={{ padding: "24px 0", fontSize: 12, color: RED }}>
            No se recibe el QR. Comprueba que el bot está corriendo.
          </div>
        ) : (
          <div style={{ padding: "32px 0" }}>
            <div style={{ width: 28, height: 28, border: `2px solid ${PRP}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
            <p style={{ fontSize: 11, color: MUTED, marginTop: 12 }}>Esperando QR...</p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
