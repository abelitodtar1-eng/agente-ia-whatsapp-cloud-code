"use client";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  role: "admin" | "operator";
  created_at: number;
  last_login: number | null;
}

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e";
const PRP = "#6c63ff"; const TEAL = "#00d4aa"; const RED = "#ff6b6b";
const TEXT = "#e2e8f0"; const MUTED = "#8892a4";

function fmtDate(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Input({ label, type = "text", value, onChange, placeholder }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", background: BG, border: `1px solid ${BORD}`, borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" }}
        onFocus={e => { e.target.style.borderColor = PRP; }}
        onBlur={e => { e.target.style.borderColor = BORD; }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>{label}</label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", background: BG, border: `1px solid ${BORD}`, borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none" }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, padding: "24px 28px", width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: MUTED, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "outline" | "danger"; disabled?: boolean;
}) {
  const styles = {
    primary: { background: PRP, color: "#fff", border: "none" },
    outline: { background: "transparent", color: MUTED, border: `1px solid ${BORD}` },
    danger:  { background: "transparent", color: RED, border: `1px solid rgba(255,107,107,.3)` },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles, borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .6 : 1, transition: "all .2s",
    }}>
      {children}
    </button>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ username: string; role: string } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "operator" });
  const [createErr, setCreateErr] = useState("");

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "operator">("operator");
  const [editPw, setEditPw] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(data => {
      if (!data || data.role !== "admin") { router.push("/"); return; }
      setMe(data);
    });
  }, [router]);

  useEffect(() => { if (me) loadUsers(); }, [me]);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateErr("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      setShowCreate(false);
      setNewUser({ username: "", password: "", role: "operator" });
      loadUsers();
      flash("Usuario creado correctamente");
    } else {
      const d = await res.json();
      setCreateErr(d.error ?? "Error al crear usuario");
    }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    const body: Record<string, string> = { role: editRole };
    if (editPw.trim()) body.password = editPw;
    await fetch(`/api/admin/users/${editUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditUser(null);
    setEditPw("");
    loadUsers();
    flash("Usuario actualizado");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    loadUsers();
    flash("Usuario eliminado");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function flash(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORD}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.push("/")} style={{ background: "transparent", border: `1px solid ${BORD}`, color: MUTED, fontSize: 12, padding: "5px 14px", borderRadius: 8, cursor: "pointer" }}>
            ← CRM
          </button>
          <h1 style={{ fontSize: 15, fontWeight: 700 }}>
            <span style={{ color: PRP }}>Admin</span> — Gestión de Usuarios
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {me && (
            <span style={{ fontSize: 12, color: MUTED }}>
              {me.username} · <span style={{ color: PRP }}>{me.role}</span>
            </span>
          )}
          <button onClick={handleLogout} style={{ background: "transparent", border: `1px solid rgba(255,107,107,.3)`, color: RED, fontSize: 12, padding: "5px 14px", borderRadius: 8, cursor: "pointer" }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>

        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px" }}>
            Usuarios del sistema — {users.length} registrados
          </h2>
          <Btn onClick={() => setShowCreate(true)}>+ Nuevo usuario</Btn>
        </div>

        {/* Toast */}
        {actionMsg && (
          <div style={{ background: "rgba(0,212,170,.08)", border: `1px solid rgba(0,212,170,.2)`, borderRadius: 8, padding: "10px 16px", fontSize: 13, color: TEAL, marginBottom: 16 }}>
            ✓ {actionMsg}
          </div>
        )}

        {/* Table */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 12, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 13 }}>Cargando...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                  {["ID", "Usuario", "Rol", "Creado", "Último acceso", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${BORD}` }}>
                    <td style={{ padding: "12px 16px", color: MUTED, fontFamily: "monospace" }}>{u.id}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: TEXT }}>{u.username}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                        background: u.role === "admin" ? `${PRP}1a` : `${TEAL}1a`,
                        color: u.role === "admin" ? PRP : TEAL,
                      }}>
                        {u.role === "admin" ? "Admin" : "Operador"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: MUTED, fontSize: 12 }}>{fmtDate(u.created_at)}</td>
                    <td style={{ padding: "12px 16px", color: MUTED, fontSize: 12 }}>{fmtDate(u.last_login)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => { setEditUser(u); setEditRole(u.role); setEditPw(""); }}
                          style={{ background: "transparent", border: `1px solid ${BORD}`, color: MUTED, fontSize: 11, padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          style={{ background: "transparent", border: "1px solid rgba(255,107,107,.2)", color: RED, fontSize: 11, padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Info card */}
        <div style={{ background: "rgba(108,99,255,.06)", border: `1px solid rgba(108,99,255,.15)`, borderRadius: 10, padding: "14px 18px", marginTop: 20, fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
          <strong style={{ color: TEXT }}>Usuario por defecto:</strong> admin / Admin2026* — Cambia la contraseña tras el primer acceso.<br/>
          <strong style={{ color: TEXT }}>Roles:</strong> Admin = acceso completo + gestión de usuarios. Operador = solo CRM (conversaciones, contactos, dashboard).
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Nuevo usuario" onClose={() => { setShowCreate(false); setCreateErr(""); }}>
          <form onSubmit={handleCreate}>
            <Input label="Usuario" value={newUser.username} onChange={v => setNewUser(p => ({ ...p, username: v }))} placeholder="nombre.usuario" />
            <Input label="Contraseña" type="password" value={newUser.password} onChange={v => setNewUser(p => ({ ...p, password: v }))} placeholder="Mín. 8 caracteres" />
            <Select label="Rol" value={newUser.role} onChange={v => setNewUser(p => ({ ...p, role: v }))} options={[{ value: "operator", label: "Operador" }, { value: "admin", label: "Administrador" }]} />
            {createErr && <p style={{ color: RED, fontSize: 12, marginBottom: 14 }}>{createErr}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <Btn variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Btn>
              <Btn>Crear usuario</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editUser && (
        <Modal title={`Editar — ${editUser.username}`} onClose={() => setEditUser(null)}>
          <form onSubmit={handleEdit}>
            <Select label="Rol" value={editRole} onChange={v => setEditRole(v as "admin" | "operator")} options={[{ value: "operator", label: "Operador" }, { value: "admin", label: "Administrador" }]} />
            <Input label="Nueva contraseña (dejar vacío para no cambiar)" type="password" value={editPw} onChange={setEditPw} placeholder="Nueva contraseña..." />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <Btn variant="outline" onClick={() => setEditUser(null)}>Cancelar</Btn>
              <Btn>Guardar cambios</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Confirmar eliminación" onClose={() => setDeleteTarget(null)}>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 24 }}>
            ¿Eliminar al usuario <strong style={{ color: TEXT }}>{deleteTarget.username}</strong>? Esta acción no se puede deshacer.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={handleDelete}>Eliminar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
