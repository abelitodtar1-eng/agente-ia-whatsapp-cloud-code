"use client";
import { useState, useEffect, useMemo } from "react";

const BG    = "#0a0c10";
const CARD  = "#1a1d27";
const BORD  = "#2a2d3e";
const PRP   = "#6c63ff";
const TEAL  = "#00d4aa";
const RED   = "#ff6b6b";
const YELL  = "#ffd166";
const TEXT  = "#e2e8f0";
const MUTED = "#8892a4";
const GREEN = "#4caf50";

interface Product {
  id: number;
  nombre: string;
  categoria: string;
  udm: string;
  stock: number;
  precio: number;
  activo: number;
}

const EMPTY: Omit<Product, "id"> = { nombre: "", categoria: "", udm: "", stock: 0, precio: 0, activo: 1 };

function Input({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ background: "#0f111a", border: `1px solid ${BORD}`, borderRadius: 8, padding: "8px 12px", color: TEXT, fontSize: 13, outline: "none" }}
      />
    </div>
  );
}

function Modal({ title, form, setForm, onSave, onClose, saving }: {
  title: string;
  form: Omit<Product, "id">;
  setForm: (f: Omit<Product, "id">) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, padding: 28, width: 420, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{title}</div>
        <Input label="Nombre *" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} placeholder="Ej: Arroz Premium 1kg" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Categoría" value={form.categoria} onChange={v => setForm({ ...form, categoria: v })} placeholder="Alimentos" />
          <Input label="Unidad (UdM)" value={form.udm} onChange={v => setForm({ ...form, udm: v })} placeholder="kg, pqt, bot…" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Precio (CUP)" value={form.precio} type="number" onChange={v => setForm({ ...form, precio: Number(v) })} />
          <Input label="Stock" value={form.stock} type="number" onChange={v => setForm({ ...form, stock: Number(v) })} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: TEXT, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={form.activo === 1} onChange={e => setForm({ ...form, activo: e.target.checked ? 1 : 0 })} />
          Visible en tienda pública
        </label>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${BORD}`, background: "transparent", color: MUTED, fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.nombre.trim()}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: PRP, color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? .6 : 1 }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TiendaView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState("");
  const [copied, setCopied]     = useState(false);
  const [modal, setModal]       = useState<{ mode: "add" | "edit"; data: Omit<Product, "id">; id?: number } | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const storeUrl = typeof window !== "undefined" ? `${window.location.origin}/tienda` : "/tienda";

  async function load() {
    const r = await fetch("/api/admin/products");
    if (r.ok) setProducts(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const visible = useMemo(() =>
    products.filter(p => !search || p.nombre.toLowerCase().includes(search.toLowerCase()))
  , [products, search]);

  const enStock  = products.filter(p => p.activo && p.stock > 0).length;
  const inactivos = products.filter(p => !p.activo).length;

  function copyLink() {
    navigator.clipboard.writeText(storeUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  async function handleSync() {
    setSyncing(true); setSyncMsg("");
    try {
      const r = await fetch("/api/admin/products/sync", { method: "POST" });
      const d = await r.json();
      setSyncMsg(r.ok ? `✓ ${d.synced} productos sincronizados` : `Error: ${d.error}`);
      if (r.ok) load();
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 4000);
    }
  }

  async function handleSave() {
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(modal.data) });
      } else {
        await fetch(`/api/admin/products/${modal.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(modal.data) });
      }
      setModal(null);
      load();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este producto?")) return;
    setDeleting(id);
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  async function toggleActivo(p: Product) {
    await fetch(`/api/admin/products/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: p.activo ? 0 : 1 }) });
    load();
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", background: BG, color: TEXT, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {modal && (
        <Modal
          title={modal.mode === "add" ? "Nuevo producto" : "Editar producto"}
          form={modal.data}
          setForm={d => setModal({ ...modal, data: d })}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}

      {/* Top bar */}
      <div style={{ background: "#12141e", borderBottom: `1px solid ${BORD}`, padding: "12px 24px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Tienda Pública</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{storeUrl}</div>
        </div>
        {syncMsg && <span style={{ fontSize: 11, color: TEAL }}>{syncMsg}</span>}
        <button onClick={handleSync} disabled={syncing} style={{ background: "transparent", border: `1px solid ${BORD}`, color: MUTED, borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>
          {syncing ? "Sincronizando…" : "↓ Sincronizar Sheets"}
        </button>
        <button onClick={copyLink} style={{ background: copied ? GREEN : "rgba(108,99,255,.15)", color: copied ? "#fff" : PRP, border: `1px solid ${copied ? GREEN : PRP}`, borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {copied ? "¡Copiado!" : "Copiar enlace"}
        </button>
        <a href="/tienda" target="_blank" rel="noopener noreferrer" style={{ background: "rgba(0,212,170,.1)", color: TEAL, border: `1px solid rgba(0,212,170,.2)`, borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
          Ver tienda
        </a>
        <button onClick={() => setModal({ mode: "add", data: { ...EMPTY } })} style={{ background: PRP, color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          + Nuevo
        </button>
      </div>

      {/* KPIs */}
      <div style={{ padding: "16px 24px 0", display: "flex", gap: 12 }}>
        {[
          { label: "Total", value: products.length, color: PRP },
          { label: "En tienda", value: enStock, color: TEAL },
          { label: "Ocultos", value: inactivos, color: inactivos > 0 ? MUTED : MUTED },
          { label: "Sin stock", value: products.filter(p => p.stock <= 0).length, color: RED },
        ].map(k => (
          <div key={k.label} style={{ background: CARD, border: `1px solid ${BORD}`, borderTop: `3px solid ${k.color}`, borderRadius: 10, padding: "12px 18px", flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{loading ? "—" : k.value}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: "12px 24px", display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="text" placeholder="Buscar producto…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 8, padding: "7px 14px", color: TEXT, fontSize: 12, outline: "none", width: 240 }}
        />
        <span style={{ fontSize: 11, color: MUTED, marginLeft: "auto" }}>{visible.length} producto{visible.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div style={{ padding: "0 24px 24px" }}>
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#12141e" }}>
                {["Visible", "Producto", "Categoría", "UdM", "Precio (CUP)", "Stock", "Acciones"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", textAlign: "left", borderBottom: `1px solid ${BORD}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 12 }}>Cargando…</td></tr>
              )}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 12 }}>Sin productos — usa "+ Nuevo" o "↓ Sincronizar Sheets"</td></tr>
              )}
              {visible.map(p => (
                <tr
                  key={p.id}
                  style={{ borderBottom: `1px solid ${BORD}`, opacity: p.activo ? 1 : 0.45 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 14px" }}>
                    <button
                      onClick={() => toggleActivo(p)}
                      title={p.activo ? "Ocultar de tienda" : "Mostrar en tienda"}
                      style={{ width: 28, height: 16, borderRadius: 8, border: "none", background: p.activo ? TEAL : BORD, cursor: "pointer", position: "relative", transition: "background .2s" }}
                    >
                      <span style={{ position: "absolute", top: 2, left: p.activo ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                    </button>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: TEXT }}>{p.nombre}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: MUTED }}>{p.categoria || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: MUTED }}>{p.udm || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: p.precio > 0 ? TEAL : MUTED }}>
                    {p.precio > 0 ? p.precio.toLocaleString("es-ES") : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: p.stock > 0 ? TEXT : RED, fontWeight: p.stock <= 0 ? 700 : 400 }}>
                    {p.stock > 0 ? `${p.stock}${p.udm ? " " + p.udm : ""}` : "Sin stock"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setModal({ mode: "edit", id: p.id, data: { nombre: p.nombre, categoria: p.categoria, udm: p.udm, stock: p.stock, precio: p.precio, activo: p.activo } })}
                        style={{ fontSize: 12, background: "rgba(108,99,255,.12)", color: PRP, border: `1px solid rgba(108,99,255,.2)`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deleting === p.id}
                        style={{ fontSize: 12, background: "rgba(255,107,107,.08)", color: RED, border: `1px solid rgba(255,107,107,.15)`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", opacity: deleting === p.id ? .5 : 1 }}
                      >
                        {deleting === p.id ? "…" : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
