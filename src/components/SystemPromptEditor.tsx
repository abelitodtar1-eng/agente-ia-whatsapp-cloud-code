"use client";
import { useState, useEffect, useRef } from "react";

export function SystemPromptEditor() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings/system-prompt")
      .then((r) => r.json())
      .then((data: { text: string; updatedAt: number }) => {
        setText(data.text);
        setSavedText(data.text);
        if (data.updatedAt) {
          setLastSaved(
            new Date(data.updatedAt * 1000).toLocaleString("es-ES", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }
      });
  }, [open]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text, open]);

  const hasChanges = text !== savedText;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/system-prompt", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al guardar.");
        return;
      }
      setSavedText(text);
      setLastSaved(
        new Date().toLocaleString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch {
      setError("Error de conexión al guardar.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!confirm("¿Descartar cambios y volver al texto guardado?")) return;
    setText(savedText);
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm border border-emerald-600 text-emerald-700 rounded hover:bg-emerald-50 transition-colors"
      >
        Prompt IA
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => !hasChanges && setOpen(false)}
        />
      )}

      {open && (
        <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-base font-medium text-gray-900">System Prompt del bot</h2>
              {lastSaved && (
                <p className="text-xs text-gray-400 mt-0.5">Último guardado: {lastSaved}</p>
              )}
            </div>
            <button
              onClick={() => {
                if (hasChanges && !confirm("Tienes cambios sin guardar. ¿Cerrar de todos modos?"))
                  return;
                setOpen(false);
              }}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ✕
            </button>
          </div>

          <div className="mx-5 mt-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            Los cambios se aplican al instante — el próximo mensaje que reciba el bot ya usará el
            nuevo prompt. No hace falta reiniciar.
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              className="w-full min-h-[400px] text-sm font-mono text-gray-800 border border-gray-300 rounded p-3 resize-none focus:outline-none focus:border-blue-500 leading-relaxed"
              placeholder="Escribe aquí las instrucciones del bot..."
              spellCheck={false}
            />
            <div className="flex justify-between mt-1">
              <span
                className={`text-xs ${text.length > 7500 ? "text-amber-600" : "text-gray-400"}`}
              >
                {text.length.toLocaleString()} / 8.000 caracteres
              </span>
              {hasChanges && (
                <span className="text-xs text-amber-600 font-medium">Cambios sin guardar</span>
              )}
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
            <button
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Descartar cambios
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving || text.length > 8000}
              className="px-5 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Guardando..." : "Guardar y aplicar"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
