"use client";
import { useEffect, useState } from "react";

interface ConnectionState {
  status: "disconnected" | "qr" | "connecting" | "connected";
  qr_string: string | null;
  phone: string | null;
}

interface QRScreenProps {
  onConnected: (phone: string) => void;
}

export function QRScreen({ onConnected }: QRScreenProps) {
  const [state, setState] = useState<ConnectionState>({
    status: "disconnected",
    qr_string: null,
    phone: null,
  });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/connection/status");
        const data: ConnectionState = await res.json();
        setState(data);
        setElapsed((e) => e + 2);
        if (data.status === "connected" && data.phone) {
          onConnected(data.phone);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [onConnected]);

  const dotColor =
    state.status === "qr"
      ? "bg-amber-400 animate-pulse"
      : state.status === "connecting"
      ? "bg-blue-500 animate-pulse"
      : "bg-gray-400";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Conectar WhatsApp</h1>
        <p className="text-sm text-gray-500 mb-6">
          Clínica Dental Sonríe Bien · IA Founders
        </p>

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className="text-xs text-gray-500 capitalize">{state.status}</span>
        </div>

        {state.qr_string ? (
          <div className="flex justify-center">
            <img
              src={state.qr_string}
              alt="QR WhatsApp"
              className="w-64 h-64 rounded-lg border border-gray-100"
            />
          </div>
        ) : elapsed > 10 && state.status !== "connecting" ? (
          <div className="py-8 text-sm text-red-500">
            No se recibe el QR. Comprueba que el bot está corriendo con{" "}
            <code className="font-mono bg-red-50 px-1 rounded">npm run start:bot</code>
          </div>
        ) : (
          <div className="py-8">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400 mt-3">Esperando QR...</p>
          </div>
        )}

        {state.qr_string && (
          <p className="text-xs text-gray-400 mt-4">
            Abre WhatsApp en tu móvil → Dispositivos vinculados → Vincular un dispositivo
          </p>
        )}
      </div>
    </div>
  );
}
