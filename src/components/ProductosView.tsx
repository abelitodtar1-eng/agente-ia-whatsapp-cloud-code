"use client";
import { useState, useEffect, FormEvent } from "react";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e";
const PRP = "#6c63ff"; const TEAL = "#00d4aa"; const RED = "#ff6b6b";
const TEXT = "#e2e8f0"; const MUTED = "#8892a4"; const YELLOW = "#ffd166";
const ORANGE = "#ff9f43";

interface SheetProducto {
  "CÓDIGO": number | string;
  "CATEGORÍA": string | null;
  "DESCRIPCIÓN": string | null;
  "UdM": string | null;
  "INVENTARIO": number | null;
  "STOCK_MÍN": number | null;
  "COSTO_UNIT_PROM": number | null;
  "VALOR_TOTAL": number | null;
  "ESTADO": string | null;
  urgencia: "CRITICO" | "COMPRAR" | "SOLICITAR" | "OK";
  velocidadDiaria: number;
  diasRestantes: number;
  abc: string;
}

interface Kpis {
  totalProductos: number;
  valorTotal: number;
  sinStock: number;
  solicitar: number;
  ok: number;
  criticos: number;
}

function urgenciaColor(u: string) {
  if (u === "CRITICO") return RED;
  if (u === "COMPRAR") return ORANGE;
  if (u === "SOLICITAR") return YELLOW;
  return TEAL;
}

function isConfirmationRequest(text: string): boolean {
  const t = text.toLowerCase();
  return (t.includes("¿") || t.includes("?")) &&
    /confirm|seguro|deseas|quieres|proceder|está bien|continuar|autoriza/.test(t);
}

async function sendWithAutoConfirm(webhookUrl: string, phone: string, message: string): Promise<string> {
  async function post(msg: string) {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message: msg }),
    });
    if (!res.ok) throw new Error(`Webhook respondió ${res.status}`);
    const data = await res.json() as { response?: string };
    return data.response ?? "";
  }

  const first = await post(message);
  if (isConfirmationRequest(first)) {
    const confirmed = await post("sí");
    return confirmed || first;
  }
  return first;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, padding: "24px 28px", width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: MUTED, fontSize: 22, cursor: "pointer", padding: "0 4px" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: "100%", background: BG, border: `1px solid ${focused ? PRP : BORD}`, borderRadius: 8,
    padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box",
  };
}

function MovimientoModal({
  product, tipo, webhookUrl, onClose, onDone,
}: {
  product: SheetProducto; tipo: "entrada" | "salida";
  webhookUrl: string; onClose: () => void; onDone: (msg: string) => void;
}) {
  const [cantidad, setCantidad] = useState("");
  const [nota, setNota] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [focus1, setFocus1] = useState(false);
  const [focus2, setFocus2] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cantidad || Number(cantidad) <= 0) { setErr("Cantidad debe ser mayor a 0"); return; }
    if (!webhookUrl) { setErr("Webhook no configurado"); return; }

    const verb = tipo === "entrada" ? "Registrar entrada" : "Registrar salida";
    const udm = product["UdM"] ?? "unid";
    const desc = product["DESCRIPCIÓN"] ?? String(product["CÓDIGO"]);
    const notaStr = nota.trim() ? `. Nota: ${nota.trim()}` : "";
    const message = `${verb}: ${cantidad} ${udm} de ${desc} (código ${product["CÓDIGO"]})${notaStr}`;

    setSending(true); setErr("");
    try {
      const reply = await sendWithAutoConfirm(webhookUrl, "admin_inventario@web", message);
      onDone(reply || "Movimiento registrado");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error de red");
    } finally {
      setSending(false);
    }
  }

  const color = tipo === "entrada" ? TEAL : RED;
  const label = tipo === "entrada" ? "Cantidad a ingresar" : "Cantidad a retirar/vender";

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: `${color}11`, border: `1px solid ${color}33`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, margin: 0 }}>{product["DESCRIPCIÓN"]}</p>
        <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
          Código {product["CÓDIGO"]} · Stock actual: <strong style={{ color: TEXT }}>{product["INVENTARIO"]?.toLocaleString("es-CU") ?? "?"} {product["UdM"]}</strong>
        </p>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>{label}</label>
        <input
          type="number" min="0.01" step="any" value={cantidad} onChange={e => setCantidad(e.target.value)}
          placeholder={`Ej: 50`} autoFocus required
          style={inputStyle(focus1)} onFocus={() => setFocus1(true)} onBlur={() => setFocus1(false)}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Nota (opcional)</label>
        <input
          type="text" value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: compra a proveedor X"
          style={inputStyle(focus2)} onFocus={() => setFocus2(true)} onBlur={() => setFocus2(false)}
        />
      </div>

      {err && <p style={{ color: RED, fontSize: 12, marginBottom: 12 }}>{err}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" onClick={onClose} style={{ padding: "8px 18px", fontSize: 13, background: "transparent", border: `1px solid ${BORD}`, color: MUTED, borderRadius: 8, cursor: "pointer" }}>
          Cancelar
        </button>
        <button type="submit" disabled={sending} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, background: color, color: "#0a0c10", border: "none", borderRadius: 8, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? .6 : 1 }}>
          {sending ? "Enviando..." : tipo === "entrada" ? "Registrar Entrada" : "Registrar Salida"}
        </button>
      </div>
    </form>
  );
}

function NuevoProductoModal({
  webhookUrl, onClose, onDone,
}: {
  webhookUrl: string; onClose: () => void; onDone: (msg: string) => void;
}) {
  const [form, setForm] = useState({ descripcion: "", categoria: "", udm: "unid", cantidad: "0", costo: "0" });
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  const [focuses, setFocuses] = useState<Record<string, boolean>>({});
  const fo = (k: string) => ({ onFocus: () => setFocuses(p => ({ ...p, [k]: true })), onBlur: () => setFocuses(p => ({ ...p, [k]: false })) });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.descripcion.trim()) { setErr("Descripción requerida"); return; }
    if (!webhookUrl) { setErr("Webhook no configurado"); return; }

    const message = `Nuevo producto: descripción "${form.descripcion.trim()}", categoría "${form.categoria || "General"}", UdM "${form.udm}", cantidad inicial ${form.cantidad}, costo unitario ${form.costo}`;
    setSending(true); setErr("");
    try {
      const reply = await sendWithAutoConfirm(webhookUrl, "admin_inventario@web", message);
      onDone(reply || "Producto creado en Sheets");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error de red");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {[
        { k: "descripcion", label: "Descripción *", placeholder: "Ej. Aceite vegetal 1L" },
        { k: "categoria", label: "Categoría", placeholder: "Ej. Alimentos" },
        { k: "udm", label: "Unidad de medida", placeholder: "kg, L, unid..." },
      ].map(({ k, label, placeholder }) => (
        <div key={k} style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>{label}</label>
          <input value={form[k as keyof typeof form]} onChange={e => set(k as keyof typeof form)(e.target.value)} placeholder={placeholder}
            required={k === "descripcion"} style={inputStyle(!!focuses[k])} {...fo(k)} />
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[{ k: "cantidad", label: "Cantidad inicial" }, { k: "costo", label: "Costo unitario" }].map(({ k, label }) => (
          <div key={k}>
            <label style={{ display: "block", fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>{label}</label>
            <input type="number" min="0" step="any" value={form[k as keyof typeof form]} onChange={e => set(k as keyof typeof form)(e.target.value)}
              style={inputStyle(!!focuses[k])} {...fo(k)} />
          </div>
        ))}
      </div>
      {err && <p style={{ color: RED, fontSize: 12, marginBottom: 12 }}>{err}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" onClick={onClose} style={{ padding: "8px 18px", fontSize: 13, background: "transparent", border: `1px solid ${BORD}`, color: MUTED, borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
        <button type="submit" disabled={sending} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, background: PRP, color: "#fff", border: "none", borderRadius: 8, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? .6 : 1 }}>
          {sending ? "Enviando..." : "Crear producto"}
        </button>
      </div>
    </form>
  );
}

export function ProductosView() {
  const [productos, setProductos] = useState<SheetProducto[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);

  const [movModal, setMovModal] = useState<{ product: SheetProducto; tipo: "entrada" | "salida" } | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);
  const [toast, setToast] = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 4000); }

  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/dashboard").then(r => r.json()) as { productos?: SheetProducto[]; kpis?: Kpis };
      if (data.productos) setProductos(data.productos);
      if (data.kpis) setKpis(data.kpis);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/settings/webhook").then(r => r.json()).then((d: Record<string, string>) => {
      if (d.url) setWebhookUrl(d.url);
    }).catch(() => {});
  }, []);

  const filtered = productos.filter(p => {
    const q = search.toLowerCase();
    return !q || String(p["DESCRIPCIÓN"] ?? "").toLowerCase().includes(q) || String(p["CATEGORÍA"] ?? "").toLowerCase().includes(q);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", background: BG, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "14px 24px", borderBottom: `1px solid ${BORD}`, background: CARD, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>Inventario</h2>
            <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Fuente: Google Sheets · cambios vía webhook n8n</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              style={{ ...inputStyle(searchFocus), width: 160, fontSize: 12 }}
              onFocus={() => setSearchFocus(true)} onBlur={() => setSearchFocus(false)} />
            <button onClick={load} style={{ padding: "8px 14px", fontSize: 12, background: "transparent", border: `1px solid ${BORD}`, color: MUTED, borderRadius: 8, cursor: "pointer" }}>↻ Refresh</button>
            <button onClick={() => setShowNuevo(true)} style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, background: PRP, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>+ Nuevo producto</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>

        {/* Toast */}
        {toast && (
          <div style={{ background: "rgba(0,212,170,.08)", border: `1px solid rgba(0,212,170,.2)`, borderRadius: 8, padding: "10px 16px", fontSize: 13, color: TEAL, marginBottom: 16, whiteSpace: "pre-wrap" }}>
            ✓ {toast}
          </div>
        )}

        {/* KPIs */}
        {kpis && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Productos", value: kpis.totalProductos, color: TEXT },
              { label: "Valor total", value: `$${kpis.valorTotal.toLocaleString("es-CU")}`, color: YELLOW },
              { label: "Sin stock", value: kpis.sinStock, color: RED },
              { label: "Críticos", value: kpis.criticos, color: ORANGE },
              { label: "OK", value: kpis.ok, color: TEAL },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 10, padding: "12px 16px" }}>
                <p style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabla */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 12, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 13 }}>Cargando desde Google Sheets...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 13 }}>
              {search ? "Sin resultados." : "Sin datos en el Sheet."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                    {["Descripción", "Cat.", "UdM", "Inventario", "Mín", "Estado", "Urgencia", "Acciones"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const inv = p["INVENTARIO"] ?? 0;
                    const min = p["STOCK_MÍN"] ?? 0;
                    const urg = p.urgencia;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORD}` }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: TEXT, maxWidth: 200 }}>
                          <div>{p["DESCRIPCIÓN"] ?? "—"}</div>
                          <div style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>#{p["CÓDIGO"]}</div>
                        </td>
                        <td style={{ padding: "10px 14px", color: MUTED, fontSize: 12 }}>{p["CATEGORÍA"] ?? "—"}</td>
                        <td style={{ padding: "10px 14px", color: MUTED, fontSize: 12 }}>{p["UdM"] ?? "—"}</td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: inv <= 0 ? RED : TEXT, fontWeight: 600 }}>
                          {inv.toLocaleString("es-CU")}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: MUTED }}>{min.toLocaleString("es-CU")}</td>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{p["ESTADO"] ?? "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${urgenciaColor(urg)}1a`, color: urgenciaColor(urg), border: `1px solid ${urgenciaColor(urg)}44` }}>
                            {urg}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => setMovModal({ product: p, tipo: "entrada" })}
                              style={{ fontSize: 11, padding: "4px 10px", background: `${TEAL}1a`, border: `1px solid ${TEAL}44`, color: TEAL, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                              + Entrada
                            </button>
                            <button onClick={() => setMovModal({ product: p, tipo: "salida" })}
                              style={{ fontSize: 11, padding: "4px 10px", background: `${RED}1a`, border: `1px solid ${RED}44`, color: RED, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                              − Salida
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ fontSize: 11, color: MUTED, marginTop: 12, textAlign: "center" }}>
          Datos desde Google Sheets · Para consultas complejas usa <strong style={{ color: PRP }}>Chat IA</strong>
        </p>
      </div>

      {/* Movimiento Modal */}
      {movModal && (
        <Modal
          title={movModal.tipo === "entrada" ? "Registrar Entrada" : "Registrar Salida / Venta"}
          onClose={() => setMovModal(null)}
        >
          <MovimientoModal
            product={movModal.product}
            tipo={movModal.tipo}
            webhookUrl={webhookUrl}
            onClose={() => setMovModal(null)}
            onDone={(msg) => { setMovModal(null); load(); flash(msg); }}
          />
        </Modal>
      )}

      {/* Nuevo Producto Modal */}
      {showNuevo && (
        <Modal title="Nuevo producto en Sheets" onClose={() => setShowNuevo(false)}>
          <NuevoProductoModal
            webhookUrl={webhookUrl}
            onClose={() => setShowNuevo(false)}
            onDone={(msg) => { setShowNuevo(false); load(); flash(msg); }}
          />
        </Modal>
      )}
    </div>
  );
}
