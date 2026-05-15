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

interface Conversation {
  id: number;
  phone: string;
  phone_alias: string | null;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
}

interface ConnectionState {
  status: string;
  phone: string | null;
}

type Tab = "conversations" | "contacts" | "webhook" | "dashboard";

export function ConnectionGate() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("conversations");
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!connected) {
    return <QRScreen onConnected={handleConnected} />;
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex flex-col h-screen">
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
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setTab("conversations")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "conversations"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Conversaciones
        </button>
        <button
          onClick={() => setTab("contacts")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "contacts"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Contactos
        </button>
        <button
          onClick={() => setTab("webhook")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "webhook"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Webhook
        </button>
        <button
          onClick={() => setTab("dashboard")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "dashboard"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Dashboard
        </button>
      </div>

      {tab === "dashboard" ? (
        <div className="flex-1 overflow-hidden">
          <DashboardView />
        </div>
      ) : tab === "webhook" ? (
        <div className="flex-1 overflow-hidden">
          <WebhookView />
        </div>
      ) : tab === "contacts" ? (
        <div className="flex-1 overflow-hidden bg-white">
          <ContactsView
            conversations={conversations}
            onNameUpdated={handleNameUpdated}
            onPhoneAliasUpdated={handlePhoneAliasUpdated}
            onDeleted={(id) => { setConversations((prev) => prev.filter((c) => c.id !== id)); }}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-72 border-r border-gray-200 bg-white overflow-y-auto shrink-0">
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </aside>
          <main className="flex-1 overflow-hidden">
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
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                Selecciona una conversación
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
