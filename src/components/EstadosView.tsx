"use client";
import { useState, useEffect, useCallback } from "react";

const BG = "#0a0c10";
const CARD = "#1a1d27";
const BORD = "#2a2d3e";
const PRP = "#6c63ff";
const TEAL = "#00d4aa";
const TEXT = "#e2e8f0";
const MUTED = "#8892a4";
const AMBER = "#f59e0b";

interface EstadosFile {
  filename: string;
  size: number;
  mtime: number;
}

interface StatusHistoryItem {
  id: number;
  image_path: string;
  sent: number;
}

interface EstadosViewProps {
  onGoToNovedades?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EstadosView({ onGoToNovedades }: EstadosViewProps) {
  const [files, setFiles] = useState<EstadosFile[]>([]);
  const [pendingFilenames, setPendingFilenames] = useState<Set<string>>(new Set());
  const [dirError, setDirError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<Set<string>>(new Set());
  const [publishingAll, setPublishingAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    const [filesRes, historyRes] = await Promise.all([
      fetch("/api/admin/estados"),
      fetch("/api/admin/status-queue"),
    ]);

    if (filesRes.ok) {
      const data = await filesRes.json() as { files: EstadosFile[]; error?: string };
      setFiles(data.files);
      setDirError(data.error ?? null);
    }

    if (historyRes.ok) {
      const history = await historyRes.json() as StatusHistoryItem[];
      const pendingSet = new Set(
        history
          .filter(i => i.sent === 0)
          .map(i => {
            const parts = i.image_path.split(/[/\\]/);
            return parts[parts.length - 1];
          })
      );
      setPendingFilenames(pendingSet);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function publishOne(filename: string) {
    setPublishing(prev => new Set(prev).add(filename));
    try {
      const res = await fetch("/api/admin/estados/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json() as { queued?: number; skipped?: number; error?: string };
      if (data.error) { showToast(`Error: ${data.error}`); return; }
      showToast(data.queued === 0 ? "Ya estaba en cola" : "✓ Estado en cola");
      await loadData();
    } finally {
      setPublishing(prev => { const s = new Set(prev); s.delete(filename); return s; });
    }
  }

  async function publishAll() {
    setPublishingAll(true);
    try {
      const res = await fetch("/api/admin/estados/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json() as { queued?: number; skipped?: number; error?: string };
      if (data.error) { showToast(`Error: ${data.error}`); return; }
      const msg = data.queued === 0
        ? `Todas ya en cola (${data.skipped} omitidas)`
        : `✓ ${data.queued} estados en cola${data.skipped ? ` · ${data.skipped} ya existían` : ""}`;
      showToast(msg);
      await loadData();
    } finally {
      setPublishingAll(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", background: BG, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          background: CARD, border: `1px solid ${PRP}`, borderRadius: 10,
          padding: "12px 20px", fontSize: 13, color: TEXT,
          boxShadow: "0 4px 20px rgba(0,0,0,.4)",
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORD}`, background: CARD, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>Estados — Portadas para publicar</h2>
          <p style={{ fontSize: 11, color: MUTED, marginTop: 3, marginBottom: 0 }}>
            {files.length > 0 ? `${files.length} imágenes · ` : ""}
            directorio: <code style={{ color: PRP }}>/app/estados</code>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {onGoToNovedades && (
            <button onClick={onGoToNovedades} style={{ padding: "6px 14px", fontSize: 11, background: "transparent", color: MUTED, border: `1px solid ${BORD}`, borderRadius: 7, cursor: "pointer" }}>
              Ver historial →
            </button>
          )}
          <button
            onClick={publishAll}
            disabled={publishingAll || files.length === 0}
            style={{ padding: "7px 18px", fontSize: 12, fontWeight: 600, background: PRP, color: "#fff", border: "none", borderRadius: 7, cursor: (publishingAll || files.length === 0) ? "not-allowed" : "pointer", opacity: (publishingAll || files.length === 0) ? 0.5 : 1 }}
          >
            {publishingAll ? "Publicando..." : "▶ Publicar todos"}
          </button>
        </div>
      </div>

      <div style={{ padding: "24px", maxWidth: 1200, width: "100%" }}>
        {dirError && (
          <div style={{ background: "rgba(245,158,11,.08)", border: `1px solid rgba(245,158,11,.3)`, borderRadius: 10, padding: "14px 18px", marginBottom: 24, fontSize: 12, color: AMBER, lineHeight: 1.6 }}>
            ⚠ {dirError}
          </div>
        )}

        {loading ? (
          <p style={{ fontSize: 12, color: MUTED }}>Cargando...</p>
        ) : files.length === 0 && !dirError ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: MUTED, fontSize: 12 }}>
            Sin imágenes en <code style={{ color: TEXT }}>/app/estados</code>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {files.map(file => {
              const pending = pendingFilenames.has(file.filename);
              const isPublishing = publishing.has(file.filename);
              return (
                <div
                  key={file.filename}
                  style={{ background: CARD, border: `1px solid ${pending ? AMBER : BORD}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: pending ? `0 0 0 1px ${AMBER}33` : "none" }}
                >
                  <div style={{ position: "relative", aspectRatio: "9/16", background: BG, overflow: "hidden", maxHeight: 280 }}>
                    <img
                      src={`/api/admin/estados/${encodeURIComponent(file.filename)}/imagen`}
                      alt={file.filename}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {pending && (
                      <div style={{ position: "absolute", top: 8, right: 8, background: AMBER, color: "#0a0c10", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 9px" }}>
                        ⏳ En cola
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px 12px", flex: 1 }}>
                    <p style={{ fontSize: 10, color: MUTED, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={file.filename}>
                      {file.filename}
                    </p>
                    <p style={{ fontSize: 10, color: "#5a6275", margin: "3px 0 0 0" }}>{formatBytes(file.size)}</p>
                  </div>
                  <div style={{ padding: "8px 12px", borderTop: `1px solid ${BORD}` }}>
                    <button
                      onClick={() => publishOne(file.filename)}
                      disabled={isPublishing || pending}
                      style={{ width: "100%", padding: "6px 0", fontSize: 11, fontWeight: 600, background: pending ? "transparent" : "rgba(108,99,255,.15)", color: pending ? AMBER : PRP, border: `1px solid ${pending ? "rgba(245,158,11,.3)" : "rgba(108,99,255,.3)"}`, borderRadius: 7, cursor: (isPublishing || pending) ? "not-allowed" : "pointer", opacity: (isPublishing || pending) ? 0.6 : 1 }}
                    >
                      {isPublishing ? "..." : pending ? "⏳ En cola" : "▶ Publicar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
