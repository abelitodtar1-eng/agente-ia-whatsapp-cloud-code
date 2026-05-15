"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRScreen } from "./QRScreen";
import { DashboardHeader } from "./DashboardHeader";
import { ConversationList } from "./ConversationList";
import { ConversationPanel } from "./ConversationPanel";
import { ContactsView } from "./ContactsView";
import { WebhookView } from "./WebhookView";
import { DashboardView } from "./DashboardView";
import { ChatbotView } from "./ChatbotView";
import { HomeView } from "./HomeView";

interface Conversation {
  id: number;
  phone: string;
  phone_alias: string | null;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
  unread_count: number;
}

interface ConnectionState {
  status: string;
  phone: string | null;
}

type Tab = "home" | "conversations" | "contacts" | "webhook" | "dashboard" | "chat";

export function ConnectionGate() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("home");
  const [me, setMe] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(data => { if (data) setMe(data); });
  }, []);

  async function handleAuthLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  useEffect(() => {
    fetch("/api/connection/status")
      .then((r) => r.json())
      .then((data: ConnectionState) => {
        if (data.status === "connected" && data.phone) {
          setPhone(data.phone);
          setConnected(true);
        }
      })
      .finally(() => setChecking(false));
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

  function handleConnected(connectedPhone: string) {
    setPhone(connectedPhone);
    setConnected(true);
  }

  function handleDisconnect() {
    setConnected(false);
    setPhone(null);
    setSelectedId(null);
    setConversations([]);
  }

  function handleSelect(id: number) {
    setSelectedId(id);
    fetch(`/api/conversations/${id}/read`, { method: "PATCH" });
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
  }

  function handleDelete() {
    setSelectedId(null);
    loadConversations();
  }

  function handleNameUpdated(id: number, name: string) {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: name.trim() || null } : c))
    );
  }

  function handlePhoneAliasUpdated(id: number, alias: string) {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, phone_alias: alias.trim() || null } : c))
    );
  }

  if (checking) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0a0c10" }}>
        <div style={{ width: 24, height: 24, border: "2px solid #6c63ff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!connected) {
    return <QRScreen onConnected={handleConnected} />;
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "home", label: "Inicio" },
    { key: "conversations", label: "Conversaciones", badge: totalUnread },
    { key: "contacts", label: "Contactos" },
    { key: "webhook", label: "Webhook" },
    { key: "dashboard", label: "Dashboard" },
    { key: "chat", label: "Chat IA" },
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
        onDisconnect={handleDisconnect}
        selectedConversation={selectedConversation}
        onModeChange={(newMode) => {
          if (!selectedConversation) return;
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedConversation.id ? { ...c, mode: newMode } : c))
          );
        }}
      />

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #2a2d3e", background: "#1a1d27", flexShrink: 0 }}>
        {TABS.map(({ key, label, badge }) => (
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
            ) : null}
          </button>
        ))}
      </div>

      {tab === "home" ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <HomeView onGoToConversation={(id) => { handleSelect(id); setTab("conversations"); }} />
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
            onDeleted={(id) => { setConversations((prev) => prev.filter((c) => c.id !== id)); }}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <aside style={{ width: 280, borderRight: "1px solid #2a2d3e", overflowY: "auto", flexShrink: 0 }}>
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </aside>
          <main style={{ flex: 1, overflow: "hidden" }}>
            {selectedConversation ? (
              <ConversationPanel
                key={selectedConversation.id}
                conversation={selectedConversation}
                onModeChange={(newMode) => {
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === selectedConversation.id ? { ...c, mode: newMode } : c
                    )
                  );
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
