"use client";
import { useState, useEffect } from "react";

export function WebhookView() {
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "testing" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings/webhook")
      .then((r) => r.json())
      .then((d: { url: string }) => {
        setUrl(d.url ?? "");
        setSaved(d.url ?? "");
      });
  }, []);

  async function handleSave() {
    setStatus("saving");
    setMsg("");
    const res = await fetch("/api/settings/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    if (data.ok) {
      setSaved(url);
      setStatus("ok");
      setMsg("Guardado correctamente");
    } else {
      setStatus("error");
      setMsg(data.error ?? "Error al guardar");
    }
  }

  async function handleTest() {
    setStatus("testing");
    setMsg("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "test@s.whatsapp.net", message: "ping" }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>;
        setStatus("ok");
        setMsg(`✓ Respondió ${res.status} — ${JSON.stringify(data).slice(0, 80)}`);
      } else {
        setStatus("error");
        setMsg(`Error ${res.status}`);
      }
    } catch (e) {
      setStatus("error");
      setMsg(`Sin respuesta: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const dirty = url !== saved;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-white">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Configuración Webhook</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          URL del webhook n8n al que se envían los mensajes entrantes de WhatsApp
        </p>
      </div>

      <div className="px-6 py-6 max-w-2xl space-y-6">
        {/* URL field */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">URL del Webhook</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setStatus("idle"); setMsg(""); }}
              placeholder="https://tu-n8n.host/webhook/..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
          </div>
          {dirty && (
            <p className="text-xs text-amber-600">⚠ Hay cambios sin guardar</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 items-center">
          <button
            onClick={handleSave}
            disabled={!url.trim() || status === "saving"}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === "saving" ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={handleTest}
            disabled={!url.trim() || status === "testing"}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === "testing" ? "Probando..." : "Probar conexión"}
          </button>
        </div>

        {/* Status message */}
        {msg && (
          <div className={`px-4 py-3 rounded-lg text-sm ${
            status === "ok"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : status === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}>
            {msg}
          </div>
        )}

        {/* Info box */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-4 space-y-2">
          <p className="text-xs font-medium text-gray-600">¿Cómo funciona?</p>
          <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
            <li>Cada mensaje entrante de WhatsApp hace un POST a esta URL</li>
            <li>El body es <code className="bg-gray-100 px-1 rounded">{"{ phone, message }"}</code></li>
            <li>El webhook debe responder <code className="bg-gray-100 px-1 rounded">{"{ response: "..." }"}</code></li>
            <li>Tiempo máximo de respuesta: 60 segundos</li>
          </ul>
          {saved && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-400">URL activa:</p>
              <p className="text-xs font-mono text-gray-600 break-all mt-0.5">{saved}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
