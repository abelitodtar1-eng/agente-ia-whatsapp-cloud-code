import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import type { WASocket } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode";
import qrcodeTerminal from "qrcode-terminal";
import path from "node:path";
import fs from "node:fs";
import { setConnectionState, getPendingOutbox, markOutboxSent, resolveContactPhone } from "../db";
import { handleIncomingMessage } from "./handler";

const AUTH_DIR = path.resolve(process.cwd(), "auth");
const logger = pino({ level: "silent" });

interface BotHandle {
  sock: WASocket;
  outboxInterval: ReturnType<typeof setInterval>;
}

let handle: BotHandle | null = null;
let isStarting = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function cleanupHandle() {
  if (handle) {
    clearInterval(handle.outboxInterval);
    try { handle.sock.end(undefined); } catch {}
    handle = null;
  }
}

function clearAuth() {
  if (fs.existsSync(AUTH_DIR)) {
    for (const f of fs.readdirSync(AUTH_DIR)) {
      fs.rmSync(path.join(AUTH_DIR, f), { recursive: true, force: true });
    }
  }
}

function phoneToJid(phone: string): string {
  // LIDs son identificadores largos (14+ dígitos), telefonos reales suelen ser <=13
  const suffix = phone.length > 13 ? "@lid" : "@s.whatsapp.net";
  return `${phone}${suffix}`;
}

async function startOutboxPoller(sock: WASocket) {
  return setInterval(async () => {
    const pending = getPendingOutbox();
    for (const item of pending) {
      const jid = phoneToJid(item.phone);
      try {
        await sock.sendMessage(jid, { text: item.content });
        markOutboxSent(item.id);
        console.log(`[outbox] enviado a ${jid}: "${item.content.slice(0,40)}"`);
      } catch (err) {
        console.error(`[outbox] fallo enviando a ${jid}:`, err instanceof Error ? err.message : err);
      }
    }
  }, 2000);
}

async function sendQrToTelegram(qrString: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    const pngBuffer = await qrcode.toBuffer(qrString);
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", "🤖 WhatsApp QR — escanea para conectar el bot");
    form.append("photo", new Blob([new Uint8Array(pngBuffer)], { type: "image/png" }), "qr.png");
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
    if (res.ok) console.log("[bot] QR enviado a Telegram");
    else console.error("[bot] Error enviando QR a Telegram:", await res.text());
  } catch (err) {
    console.error("[bot] sendQrToTelegram error:", err);
  }
}

export async function start(): Promise<void> {
  if (isStarting) {
    console.log("[bot] start() ya en curso, ignorando llamada duplicada");
    return;
  }
  isStarting = true;
  clearReconnectTimer();

  let version: [number, number, number] | undefined;
  try {
    const fetched = await fetchLatestBaileysVersion();
    version = fetched.version;
  } catch (err) {
    console.warn("[bot] No se pudo obtener última versión Baileys:", err);
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: Browsers.macOS("Desktop"),
    printQRInTerminal: false,
  });

  isStarting = false;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcodeTerminal.generate(qr, { small: true });
      try {
        const qrDataUrl = await qrcode.toDataURL(qr);
        setConnectionState({ status: "qr", qr_string: qrDataUrl, phone: null });
        await sendQrToTelegram(qr);
      } catch {
        setConnectionState({ status: "qr", qr_string: qr, phone: null });
      }
    }

    if (connection === "connecting") {
      const current = (await import("../db")).getConnectionState();
      if (current.status === "disconnected" || current.status === "qr") {
        setConnectionState({ status: "connecting" });
      }
    }

    if (connection === "open") {
      const phone = sock.user?.id?.split(":")[0] ?? null;
      setConnectionState({ status: "connected", qr_string: null, phone });
      console.log("[bot] Conectado:", phone);

      cleanupHandle();
      const outboxInterval = await startOutboxPoller(sock);
      handle = { sock, outboxInterval };
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      console.log("[bot] Conexión cerrada, código:", code);

      // Logged out or auth revoked — need fresh QR
      if (code === DisconnectReason.loggedOut || code === 401) {
        cleanupHandle();
        clearAuth();
        setConnectionState({ status: "disconnected", qr_string: null, phone: null });
        clearReconnectTimer();
        reconnectTimer = setTimeout(() => start(), 10000);
        return;
      }

      // QR timeout (408) — wait longer to avoid WA rate limiting
      if (code === 408) {
        cleanupHandle();
        clearAuth();
        setConnectionState({ status: "disconnected", qr_string: null, phone: null });
        console.log("[bot] QR timeout 408: esperando 15s antes de generar nuevo QR...");
        clearReconnectTimer();
        reconnectTimer = setTimeout(() => start(), 15000);
        return;
      }

      // Conflict (440) — another WA Web session is active. Clear auth and start fresh.
      if (code === 440) {
        cleanupHandle();
        clearAuth();
        setConnectionState({ status: "disconnected", qr_string: null, phone: null });
        console.log("[bot] Conflicto 440: esperando 20s antes de reintentar...");
        clearReconnectTimer();
        reconnectTimer = setTimeout(() => start(), 20000);
        return;
      }

      // Other disconnects — reconnect with existing creds
      cleanupHandle();
      clearReconnectTimer();
      reconnectTimer = setTimeout(() => start(), 5000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    console.log(`[bot] messages.upsert type=${type} count=${messages.length}`);
    if (type !== "notify" && type !== "append") return;
    const nowSec = Math.floor(Date.now() / 1000);
    for (const msg of messages) {
      const msgTime = (msg.messageTimestamp as number) ?? 0;
      console.log(`[bot]   msg from=${msg.key.remoteJid} fromMe=${msg.key.fromMe} hasText=${!!(msg.message?.conversation || msg.message?.extendedTextMessage)}`);
      if (type === "append" && nowSec - msgTime > 60) continue;
      await handleIncomingMessage(sock, msg);
    }
  });

  // Resolve LID → real phone when WA sends contact roster
  sock.ev.on("contacts.upsert", (contacts) => {
    for (const c of contacts) {
      try {
        const id = c.id ?? "";
        const cAny = c as unknown as Record<string, unknown>;
        const lid = cAny.lid as string | undefined;

        // Case 1: phoneNumber field directly on a LID contact
        const phoneNumber = cAny.phoneNumber as string | undefined;
        if (id.endsWith("@lid") && phoneNumber) {
          const lidNum = id.replace(/@lid$/, "");
          const real = phoneNumber.replace(/^\+/, "");
          console.log(`[contacts] LID ${lidNum} → +${real} (phoneNumber field)`);
          resolveContactPhone(lidNum, real);
          continue;
        }

        // Case 2: id is phone JID, lid field is the LID
        if (id.endsWith("@s.whatsapp.net") && lid?.endsWith("@lid")) {
          const real = id.replace(/@s\.whatsapp\.net$/, "");
          const lidNum = lid.replace(/@lid$/, "");
          console.log(`[contacts] LID ${lidNum} → +${real} (lid field)`);
          resolveContactPhone(lidNum, real);
          continue;
        }

        // Case 3: id is LID, lid field is the phone JID
        if (id.endsWith("@lid") && lid?.endsWith("@s.whatsapp.net")) {
          const lidNum = id.replace(/@lid$/, "");
          const real = lid.replace(/@s\.whatsapp\.net$/, "");
          console.log(`[contacts] LID ${lidNum} → +${real} (reverse lid field)`);
          resolveContactPhone(lidNum, real);
        }
      } catch (e) {
        console.error("[contacts] upsert error:", e);
      }
    }
  });
}

export async function fetchProfilePicture(phone: string): Promise<string | null> {
  if (!handle) return null;
  try {
    const jid = phoneToJid(phone);
    const url = await handle.sock.profilePictureUrl(jid, "image");
    return url ?? null;
  } catch {
    return null;
  }
}

export async function shutdown(): Promise<void> {
  clearReconnectTimer();
  cleanupHandle();
  isStarting = false;
  setConnectionState({ status: "disconnected", qr_string: null, phone: null });
}
