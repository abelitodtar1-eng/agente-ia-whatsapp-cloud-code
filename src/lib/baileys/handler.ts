import type { WASocket, proto } from "@whiskeysockets/baileys";
import {
  getOrCreateConversation,
  insertMessage,
  getRecentHistory,
  getConnectionState,
  enqueueOutbox,
  upsertAppointment,
  cancelAppointment as cancelAppointmentDB,
  getAppointmentsByConversation,
  getSystemPrompt,
  type Conversation,
} from "../db";

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ??
  "https://dtar-n8n.oj16f5.easypanel.host/webhook/33c121cd-ad30-4531-b77a-237170f34098";

function extractText(msg: proto.IWebMessageInfo): string | null {
  return (
    msg.message?.conversation ??
    msg.message?.extendedTextMessage?.text ??
    null
  );
}

async function processWithN8N(phone: string, message: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const resp = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: `${phone}@s.whatsapp.net`, message }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`n8n webhook ${resp.status}: ${body.slice(0, 200)}`);
    }
    const data = (await resp.json()) as { response?: string };
    return data.response ?? "Lo siento, no pude procesar tu mensaje.";
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleIncomingMessage(
  sock: WASocket,
  msg: proto.IWebMessageInfo
): Promise<void> {
  const remoteJid = msg.key.remoteJid ?? "";

  if (
    remoteJid.endsWith("@g.us") ||
    remoteJid.endsWith("@newsletter") ||
    remoteJid.endsWith("@broadcast")
  ) {
    console.log("[handler] skip: grupo/canal");
    return;
  }
  if (
    !remoteJid.endsWith("@s.whatsapp.net") &&
    !remoteJid.endsWith("@lid")
  ) {
    console.log(`[handler] skip: jid=${remoteJid}`);
    return;
  }

  const text = extractText(msg);
  if (!text?.trim()) {
    console.log("[handler] skip: sin texto");
    return;
  }
  console.log(
    `[handler] OK from=${remoteJid} fromMe=${msg.key.fromMe} text="${text.slice(0, 40)}"`
  );

  const phone = remoteJid.replace(/@(s\.whatsapp\.net|lid)$/, "");
  const pushName = msg.pushName ?? null;

  const conversation = getOrCreateConversation(phone, pushName);

  if (msg.key.fromMe) {
    const recent = getRecentHistory(conversation.id, 5);
    const alreadyStored = recent.some(
      (m) =>
        m.content === text &&
        (m.role === "assistant" || m.role === "human")
    );
    if (alreadyStored) return;
    insertMessage(conversation.id, "human", text);
    return;
  }

  insertMessage(conversation.id, "user", text);

  const { mode } = conversation;
  if (mode !== "AI") return;

  try {
    console.log(`[handler] → n8n phone=${phone}`);
    const reply = await processWithN8N(phone, text);
    insertMessage(conversation.id, "assistant", reply);
    await sock.sendMessage(remoteJid, { text: reply });
    console.log(`[handler] ← reply sent (${reply.length} chars)`);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const cause = (err as { cause?: unknown })?.cause;
    const status = (err as { status?: unknown })?.status;
    console.error(
      "[bot] Error procesando mensaje:",
      errMsg,
      "status=",
      status,
      "cause=",
      cause
    );
    if (err instanceof Error && err.stack)
      console.error(err.stack.split("\n").slice(0, 5).join("\n"));
  }
}

export { getAppointmentsByConversation };
