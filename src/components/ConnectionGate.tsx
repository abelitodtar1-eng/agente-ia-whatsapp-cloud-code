"use client";
import { useState, useEffect } from "react";
import { QRScreen } from "./QRScreen";
import { DashboardHeader } from "./DashboardHeader";
import { ConversationList } from "./ConversationList";
import { ConversationPanel } from "./ConversationPanel";

interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
}

interface ConnectionState {
  status: string;
  phone: string | null;
}

export function ConnectionGate() {
  const [connected, setConnected] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);

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
    </div>
  );
}
