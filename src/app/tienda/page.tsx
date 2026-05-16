"use client";
import { useState, useEffect, useMemo } from "react";

const BG    = "#0a0c10";
const CARD  = "#1a1d27";
const BORD  = "#2a2d3e";
const PRP   = "#6c63ff";
const TEAL  = "#00d4aa";
const RED   = "#ff6b6b";
const TEXT  = "#e2e8f0";
const MUTED = "#8892a4";
const GREEN = "#4caf50";

interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  udm: string;
  stock: number;
  precio: number;
  estado: string;
  imagen: string | null;
}

function stockBadge(p: Producto) {
  if (p.stock <= 0 || p.estado.includes("SIN STOCK")) return { label: "Sin stock", color: RED };
  if (p.estado.includes("SOLICITAR")) return { label: "Poco stock", color: "#ffd166" };
  if (p.stock < 5) return { label: `Últimas ${p.stock}`, color: "#ffd166" };
  return { label: "Disponible", color: GREEN };
}

function waMensaje(nombre: string, precio: number, udm: string) {
  return encodeURIComponent(
    `Hola! Quiero pedir: *${nombre}* (${precio > 0 ? precio.toLocaleString("es-ES") + " CUP" : "consultar precio"}${udm ? " / " + udm : ""})`
  );
}

export default function TiendaPublica() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [phone, setPhone]         = useState<string>("");
  const [search, setSearch]       = useState("");
  const [catFiltro, setCatFiltro] = useState("Todos");
  const [soloStock, setSoloStock] = useState(true);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch("/api/tienda")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.productos) setProductos(d.productos);
        if (d?.phone)     setPhone(d.phone.replace(/\D/g, ""));
      })
      .finally(() => setLoading(false));
  }, []);

  const categorias = useMemo(() => {
    const cats = [...new Set(productos.map(p => p.categoria).filter(Boolean))].sort();
    return ["Todos", ...cats];
  }, [productos]);

  const visible = useMemo(() => productos.filter(p => {
    if (soloStock && (p.stock <= 0 || p.estado.includes("SIN STOCK"))) return false;
    if (catFiltro !== "Todos" && p.categoria !== catFiltro) return false;
    if (search && !p.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [productos, soloStock, catFiltro, search]);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#12141e", borderBottom: `1px solid ${BORD}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>DTAR <span style={{ color: PRP }}>Tienda</span></div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Catálogo de productos</div>
        </div>
        {phone && (
          <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
            style={{ background: GREEN, color: "#fff", padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            WhatsApp
          </a>
        )}
      </div>

      {/* Filters */}
      <div style={{ background: "#12141e", borderBottom: `1px solid ${BORD}`, padding: "10px 24px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input
          type="text" placeholder="Buscar producto..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 8, padding: "7px 14px", color: TEXT, fontSize: 13, outline: "none", width: 220 }}
        />
        <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
          style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 8, padding: "7px 14px", color: TEXT, fontSize: 13, outline: "none", cursor: "pointer" }}>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={soloStock} onChange={e => setSoloStock(e.target.checked)} />
          Solo en stock
        </label>
        <span style={{ marginLeft: "auto", fontSize: 11, color: MUTED }}>{visible.length} producto{visible.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Grid */}
      <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {loading && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: MUTED, fontSize: 13 }}>Cargando productos…</div>
        )}
        {!loading && visible.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: MUTED, fontSize: 13 }}>Sin productos que coincidan</div>
        )}
        {visible.map(p => {
          const badge = stockBadge(p);
          const disponible = p.stock > 0 && !p.estado.includes("SIN STOCK");
          return (
            <div key={p.id} style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", opacity: disponible ? 1 : 0.55 }}>

              {/* Image */}
              {p.imagen ? (
                <img
                  src={`/api/product-images/${p.imagen}`}
                  alt={p.nombre}
                  style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{ width: "100%", height: 100, background: "#12141e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                  📦
                </div>
              )}

              {/* Content */}
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {p.categoria && (
                  <span style={{ fontSize: 10, color: PRP, background: "rgba(108,99,255,.12)", padding: "2px 8px", borderRadius: 20, alignSelf: "flex-start", fontWeight: 600 }}>
                    {p.categoria}
                  </span>
                )}

                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>{p.nombre}</div>

                <div style={{ fontSize: 20, fontWeight: 700, color: TEAL }}>
                  {p.precio > 0
                    ? <>{p.precio.toLocaleString("es-ES")} CUP{p.udm && <span style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}> / {p.udm}</span>}</>
                    : <span style={{ fontSize: 13, color: MUTED, fontWeight: 400 }}>Consultar precio</span>
                  }
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: badge.color, background: `${badge.color}1a`, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
                    {badge.label}
                  </span>
                  {p.stock > 0 && <span style={{ fontSize: 11, color: MUTED }}>{p.stock} {p.udm}</span>}
                </div>

                {phone && disponible && (
                  <a
                    href={`https://wa.me/${phone}?text=${waMensaje(p.nombre, p.precio, p.udm)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ marginTop: "auto", background: PRP, color: "#fff", textAlign: "center", padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "block" }}
                  >
                    Pedir por WhatsApp
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", padding: "16px 24px", fontSize: 11, color: MUTED, borderTop: `1px solid ${BORD}` }}>
        DTAR · Sistema de Gestión
      </div>
    </div>
  );
}
