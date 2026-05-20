"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConectarView } from "./ConectarView";
import { DashboardHeader } from "./DashboardHeader";
import { ConversationList } from "./ConversationList";
import { ConversationPanel } from "./ConversationPanel";
import { ContactsView } from "./ContactsView";
import { WebhookView } from "./WebhookView";
import { DashboardView } from "./DashboardView";
import { ChatbotView } from "./ChatbotView";
import { HomeView } from "./HomeView";
import { TiendaView } from "./TiendaView";
import { PedidosView } from "./PedidosView";
import { CatalogoView } from "./CatalogoView";
import { ProductosView } from "./ProductosView";
import { NovedadesView } from "./NovedadesView";
import { EstadosView } from "./EstadosView";

interface Conversation {
  id: number;
  phone: string;
  phone_alias: string | null;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
  unread_count: number;
  last_message: string | null;
  last_message_role: string | null;
}

type Tab = "home" | "conversations" | "contacts" | "webhook" | "dashboard" | "chat" | "tienda" | "pedidos" | "catalogo" | "productos" | "novedades" | "estados" | "conectar";

export function ConnectionGate() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [me, setMe] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(data => { if (data) setMe(data); });
  }, []);

  // Initial WA status check (non-blocking)
  useEffect(() => {
    fetch("/api/connection/status")
      .then(r => r.json())
      .then((data: { status: string; phone: string | null }) => {
        if (data.status === "connected" && data.phone) {
          setPhone(data.phone);
          setConnected(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!connected) return;
    loadConversations();
    const interval = setInterval(loadConversations, 2000);
    return () => clearInterval(interval);
  }, [connected]);

  async function loadConversations() {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data: Conversation[] = await res.json();
      setConversations(data);
    }
  }

  async function handleAuthLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function handleConnected(connectedPhone: string) {
    setPhone(connectedPhone);
    setConnected(true);
  }

  function handleDisconnected() {
    setConnected(false);
    setPhone(null);
    setSelectedId(null);
    setConversations([]);
  }

  function handleSelect(id: number) {
    setSelectedId(id);
    fetch(`/api/conversations/${id}/read`, { method: "PATCH" });
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
  }

  function handleDelete() {
    setSelectedId(null);
    loadConversations();
  }

  function handleNameUpdated(id: number, name: string) {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, name: name.trim() || null } : c));
  }

  function handlePhoneAliasUpdated(id: number, alias: string) {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, phone_alias: alias.trim() || null } : c));
  }

  const selectedConversation = conversations.find(c => c.id === selectedId) ?? null;
  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  const TABS: { key: Tab; label: string; badge?: number; dot?: string }[] = [
    { key: "home", label: "Inicio" },
    { key: "conversations", label: "Conversaciones", badge: totalUnread },
    { key: "contacts", label: "Contactos" },
    { key: "webhook", label: "Webhook" },
    { key: "dashboard", label: "Dashboard" },
    { key: "chat", label: "Chat IA" },
    { key: "tienda", label: "Tienda" },
    { key: "pedidos", label: "Pedidos" },
    { key: "catalogo", label: "Catálogo" },
    { key: "productos", label: "Productos" },
    { key: "novedades", label: "Novedades" },
    { key: "estados", label: "Estados" },
    { key: "conectar", label: "Conectar", dot: connected ? "#00d4aa" : "#ff6b6b" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0a0c10", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* User bar */}
      {me && (
        <div style={{ background: "#12141e", borderBottom: "1px solid #2a2d3e", padding: "5px 20px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "#8892a4" }}>
            {me.username} · <span style={{ color: "#6c63ff" }}>{me.role === "admin" ? "Administrador" : "Operador"}</span>
          </span>
          {me.role === "admin" && (
            <a href="/admin" style={{ fontSize: 11, color: "#6c63ff", textDecoration: "none", padding: "2px 10px", borderRadius: 20, border: "1px solid rgba(108,99,255,.3)" }}>
              Panel Admin
            </a>
          )}
          <button onClick={handleAuthLogout} style={{ fontSize: 11, color: "#ff6b6b", background: "transparent", border: "1px solid rgba(255,107,107,.2)", padding: "2px 10px", borderRadius: 20, cursor: "pointer" }}>
            Salir
          </button>
        </div>
      )}

      <DashboardHeader
        phone={phone}
        connected={connected}
        selectedConversation={selectedConversation}
        onModeChange={(newMode) => {
          if (!selectedConversation) return;
          setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, mode: newMode } : c));
        }}
      />

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #2a2d3e", background: "#1a1d27", flexShrink: 0 }}>
        {TABS.map(({ key, label, badge, dot }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "10px 20px", fontSize: 12, fontWeight: 600, border: "none",
              borderBottom: tab === key ? "2px solid #6c63ff" : "2px solid transparent",
              background: "transparent", color: tab === key ? "#6c63ff" : "#8892a4",
              cursor: "pointer", transition: "color .15s", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {label}
            {badge ? (
              <span style={{ background: "#ff6b6b", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: "50%", minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                {badge}
              </span>
            ) : dot ? (
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "novedades" ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <NovedadesView />
        </div>
      ) : tab === "estados" ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <EstadosView onGoToNovedades={() => setTab("novedades")} />
        </div>
      ) : tab === "catalogo" ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <CatalogoView />
        </div>
      ) : tab === "productos" ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ProductosView />
        </div>
      ) : tab === "pedidos" ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <PedidosView />
        </div>
      ) : tab === "conectar" ? (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <ConectarView onConnected={handleConnected} onDisconnected={handleDisconnected} />
        </div>
      ) : tab === "home" ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <HomeView onGoToConversation={(id) => { handleSelect(id); setTab("conversations"); }} />
        </div>
      ) : tab === "tienda" ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <TiendaView />
        </div>
      ) : tab === "chat" ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ChatbotView />
        </div>
      ) : tab === "dashboard" ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <DashboardView />
        </div>
      ) : tab === "webhook" ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <WebhookView />
        </div>
      ) : tab === "contacts" ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ContactsView
            conversations={conversations}
            onNameUpdated={handleNameUpdated}
            onPhoneAliasUpdated={handlePhoneAliasUpdated}
            onDeleted={(id) => { setConversations(prev => prev.filter(c => c.id !== id)); }}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <aside style={{ width: 280, borderRight: "1px solid #2a2d3e", overflowY: "auto", flexShrink: 0 }}>
            <ConversationList conversations={conversations} selectedId={selectedId} onSelect={handleSelect} />
          </aside>
          <main style={{ flex: 1, overflow: "hidden" }}>
            {selectedConversation ? (
              <ConversationPanel
                key={selectedConversation.id}
                conversation={selectedConversation}
                onModeChange={(newMode) => {
                  setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, mode: newMode } : c));
                }}
                onDelete={handleDelete}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 13, color: "#8892a4" }}>
                Selecciona una conversación
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
