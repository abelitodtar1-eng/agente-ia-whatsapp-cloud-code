import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { scryptSync, randomBytes } from "node:crypto";

const DATA_DIR = path.resolve(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "messages.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
    phone_alias TEXT,
    last_message_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id),
    role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conv
    ON messages(conversation_id, created_at);

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id),
    google_event_id TEXT UNIQUE,
    phone TEXT NOT NULL,
    patient_name TEXT,
    service TEXT NOT NULL,
    professional TEXT,
    starts_at INTEGER NOT NULL,
    ends_at INTEGER NOT NULL,
    status TEXT CHECK(status IN ('confirmed','cancelled','pending')) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_appointments_starts ON appointments(starts_at);
  CREATE INDEX IF NOT EXISTS idx_appointments_conv ON appointments(conversation_id);

  CREATE TABLE IF NOT EXISTS connection_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    status TEXT CHECK(status IN ('disconnected','qr','connecting','connected','pairing')) NOT NULL DEFAULT 'disconnected',
    qr_string TEXT,
    phone TEXT,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  INSERT OR IGNORE INTO connection_state (id, status) VALUES (1, 'disconnected');

  CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    phone TEXT NOT NULL,
    content TEXT NOT NULL,
    sent INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(sent, created_at);

  CREATE TABLE IF NOT EXISTS status_queue (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    image_path     TEXT NOT NULL,
    caption        TEXT NOT NULL DEFAULT '',
    sent           INTEGER NOT NULL DEFAULT 0,
    contacts_count INTEGER NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('system_prompt', '__INITIAL__');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('n8n_webhook_url', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('n8n_webhook_inventario', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('n8n_webhook_contabilidad', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('n8n_webhook_vendedora', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('google_sheet_id', '1srqMvqVqqF4Hblk611Rrdl_IS1mFQvS1UMkFo2yiv7M');
`);


// ─── Auth tables ─────────────────────────────────────────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT CHECK(role IN ('admin','operator')) NOT NULL DEFAULT 'operator',
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  last_login    INTEGER
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`).run();

// Migration: add 'pairing' to connection_state CHECK constraint (SQLite requires table recreation)
{
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='connection_state'").get() as { sql: string } | undefined;
  if (row && !row.sql.includes("'pairing'")) {
    db.exec(`
      CREATE TABLE connection_state_new (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        status TEXT CHECK(status IN ('disconnected','qr','connecting','connected','pairing')) NOT NULL DEFAULT 'disconnected',
        qr_string TEXT,
        phone TEXT,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      INSERT OR IGNORE INTO connection_state_new SELECT id, 'disconnected', NULL, phone, updated_at FROM connection_state;
      DROP TABLE connection_state;
      ALTER TABLE connection_state_new RENAME TO connection_state;
    `);
    console.log("[db] Migration: connection_state recreada con soporte pairing");
  }
}

db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`).run();

// Seed default admin on first run
const _userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
if (_userCount === 0) {
  const _salt = randomBytes(16).toString("hex");
  const _hash = scryptSync("Admin2026*", _salt, 64).toString("hex");
  db.prepare("INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, 'admin')")
    .run("admin", `${_salt}:${_hash}`);
}

// ─── Payments table ──────────────────────────────────────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS payments (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id  INTEGER NOT NULL REFERENCES conversations(id),
  transaction_uuid TEXT UNIQUE NOT NULL,
  merchant_op_id   TEXT NOT NULL,
  amount           REAL NOT NULL,
  description      TEXT NOT NULL,
  status           TEXT CHECK(status IN ('pending','completed','cancelled','failed')) NOT NULL DEFAULT 'pending',
  link_confirm     TEXT,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch())
)`).run();

db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('enzona_consumer_key', '')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('enzona_consumer_secret', '')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('enzona_merchant_uuid', '')`).run();

// Migrations — safe to run on every startup (no-op if column already exists)
try { db.exec("ALTER TABLE conversations ADD COLUMN phone_alias TEXT"); } catch {}
try { db.exec("ALTER TABLE conversations ADD COLUMN last_message_at INTEGER"); } catch {}
try { db.exec("ALTER TABLE conversations ADD COLUMN unread_count INTEGER NOT NULL DEFAULT 0"); } catch {}

export interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  phone_alias: string | null;
  last_message_at: number | null;
  unread_count: number;
  created_at: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "human";
  content: string;
  created_at: number;
}

export interface Appointment {
  id: number;
  conversation_id: number;
  google_event_id: string | null;
  phone: string;
  patient_name: string | null;
  service: string;
  professional: string | null;
  starts_at: number;
  ends_at: number;
  status: "confirmed" | "cancelled" | "pending";
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface ConnectionState {
  status: "disconnected" | "qr" | "connecting" | "connected" | "pairing";
  qr_string: string | null;
  phone: string | null;
  updated_at: number;
}

// --- Conversations ---

function phoneAlias(phone: string): string | null {
  // LIDs are 14+ digits — not real phone numbers
  return phone.length <= 13 ? `+${phone}` : null;
}

export function getOrCreateConversation(phone: string, name?: string | null): Conversation {
  const existing = db
    .prepare("SELECT * FROM conversations WHERE phone = ?")
    .get(phone) as Conversation | undefined;
  if (existing) {
    if (name && name !== existing.name) {
      db.prepare("UPDATE conversations SET name = ? WHERE phone = ?").run(name, phone);
      existing.name = name;
    }
    return existing;
  }
  const alias = phoneAlias(phone);
  const result = db
    .prepare("INSERT INTO conversations (phone, name, phone_alias) VALUES (?, ?, ?) RETURNING *")
    .get(phone, name ?? null, alias) as Conversation;
  return result;
}

// Called when Baileys resolves a LID → real phone mapping
export function resolveContactPhone(lidOrPhone: string, realPhone: string): void {
  db.prepare("UPDATE conversations SET phone_alias = ? WHERE phone = ?")
    .run(`+${realPhone}`, lidOrPhone);
}

export function backfillPhoneAliases(): number {
  const rows = db
    .prepare("SELECT id, phone FROM conversations WHERE phone_alias IS NULL AND length(phone) <= 13")
    .all() as { id: number; phone: string }[];
  for (const r of rows) {
    db.prepare("UPDATE conversations SET phone_alias = ? WHERE id = ?").run(`+${r.phone}`, r.id);
  }
  return rows.length;
}

export function listConversations(): (Conversation & { last_message: string | null; last_message_role: string | null })[] {
  return db.prepare(`
    SELECT c.*,
      m.content  AS last_message,
      m.role     AS last_message_role
    FROM conversations c
    LEFT JOIN messages m ON m.id = (
      SELECT id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
    )
    ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
  `).all() as (Conversation & { last_message: string | null; last_message_role: string | null })[];
}

export function setMode(conversationId: number, mode: "AI" | "HUMAN"): void {
  db.prepare("UPDATE conversations SET mode = ? WHERE id = ?").run(mode, conversationId);
}

export function deleteConversation(conversationId: number): void {
  db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(conversationId);
  db.prepare("DELETE FROM appointments WHERE conversation_id = ?").run(conversationId);
  db.prepare("DELETE FROM outbox WHERE conversation_id = ?").run(conversationId);
  db.prepare("DELETE FROM conversations WHERE id = ?").run(conversationId);
}

export function updateConversationName(id: number, name: string): void {
  db.prepare("UPDATE conversations SET name = ? WHERE id = ?").run(name.trim() || null, id);
}

export function updateConversationPhoneAlias(id: number, phoneAlias: string): void {
  db.prepare("UPDATE conversations SET phone_alias = ? WHERE id = ?").run(phoneAlias.trim() || null, id);
}


export function getConversationById(id: number): Conversation | undefined {
  return db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as Conversation | undefined;
}

// --- Messages ---

export function insertMessage(
  conversationId: number,
  role: "user" | "assistant" | "human",
  content: string
): void {
  db.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)").run(
    conversationId,
    role,
    content
  );
  db.prepare("UPDATE conversations SET last_message_at = unixepoch() WHERE id = ?").run(
    conversationId
  );
  if (role === "user") {
    db.prepare("UPDATE conversations SET unread_count = unread_count + 1 WHERE id = ?").run(conversationId);
  }
}

export function markConversationRead(conversationId: number): void {
  db.prepare("UPDATE conversations SET unread_count = 0 WHERE id = ?").run(conversationId);
}

export function getMessages(conversationId: number): Message[] {
  return db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId) as Message[];
}

export function getRecentHistory(conversationId: number, limit: number): Message[] {
  const rows = db
    .prepare(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(conversationId, limit) as Message[];
  return rows.reverse();
}

// --- Appointments ---

export interface UpsertAppointmentData {
  conversationId: number;
  googleEventId?: string | null;
  phone: string;
  patientName?: string | null;
  service: string;
  professional?: string | null;
  startsAt: number;
  endsAt: number;
  status: "confirmed" | "cancelled" | "pending";
  notes?: string | null;
}

export function upsertAppointment(data: UpsertAppointmentData): void {
  db.prepare(`
    INSERT INTO appointments
      (conversation_id, google_event_id, phone, patient_name, service, professional, starts_at, ends_at, status, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(google_event_id) DO UPDATE SET
      patient_name = excluded.patient_name,
      service = excluded.service,
      professional = excluded.professional,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      status = excluded.status,
      notes = excluded.notes,
      updated_at = unixepoch()
  `).run(
    data.conversationId,
    data.googleEventId ?? null,
    data.phone,
    data.patientName ?? null,
    data.service,
    data.professional ?? null,
    data.startsAt,
    data.endsAt,
    data.status,
    data.notes ?? null
  );
}

export function getAppointmentByEventId(googleEventId: string): Appointment | undefined {
  return db
    .prepare("SELECT * FROM appointments WHERE google_event_id = ?")
    .get(googleEventId) as Appointment | undefined;
}

export function getAppointmentsByConversation(conversationId: number): Appointment[] {
  return db
    .prepare(
      "SELECT * FROM appointments WHERE conversation_id = ? ORDER BY starts_at DESC"
    )
    .all(conversationId) as Appointment[];
}

export function cancelAppointment(googleEventId: string): void {
  db.prepare(
    "UPDATE appointments SET status = 'cancelled', updated_at = unixepoch() WHERE google_event_id = ?"
  ).run(googleEventId);
}

export function confirmAppointment(googleEventId: string): void {
  db.prepare(
    "UPDATE appointments SET status = 'confirmed', updated_at = unixepoch() WHERE google_event_id = ?"
  ).run(googleEventId);
}

// --- Connection state ---

export function getConnectionState(): ConnectionState {
  return db
    .prepare("SELECT status, qr_string, phone, updated_at FROM connection_state WHERE id = 1")
    .get() as ConnectionState;
}

export function setConnectionState(
  state: Partial<Pick<ConnectionState, "status" | "qr_string" | "phone">>
): void {
  const current = getConnectionState();
  db.prepare(`
    UPDATE connection_state
    SET status = ?, qr_string = ?, phone = ?, updated_at = unixepoch()
    WHERE id = 1
  `).run(
    state.status ?? current.status,
    "qr_string" in state ? state.qr_string : current.qr_string,
    "phone" in state ? state.phone : current.phone
  );
}

// --- Outbox ---

export function enqueueOutbox(conversationId: number, phone: string, content: string): void {
  db.prepare(
    "INSERT INTO outbox (conversation_id, phone, content) VALUES (?, ?, ?)"
  ).run(conversationId, phone, content);
}

export interface OutboxItem {
  id: number;
  conversation_id: number;
  phone: string;
  content: string;
  sent: number;
}

export function getPendingOutbox(): OutboxItem[] {
  return db
    .prepare("SELECT * FROM outbox WHERE sent = 0 ORDER BY created_at ASC")
    .all() as OutboxItem[];
}

export function markOutboxSent(id: number): void {
  db.prepare("UPDATE outbox SET sent = 1 WHERE id = ?").run(id);
}

// ─── Status queue (cross-process IPC para estados WA) ─────────────────────────
export interface StatusQueueItem { id: number; image_path: string; caption: string }

export interface StatusHistoryItem {
  id: number;
  image_path: string;
  caption: string;
  sent: number;
  contacts_count: number;
  created_at: number;
}

// migration: add contacts_count if not exists (safe on existing DBs)
try {
  db.prepare("ALTER TABLE status_queue ADD COLUMN contacts_count INTEGER NOT NULL DEFAULT 0").run();
} catch { /* column already exists */ }

export function enqueueStatus(imagePath: string, caption: string): void {
  db.prepare("INSERT INTO status_queue (image_path, caption) VALUES (?, ?)").run(imagePath, caption);
}

export function getPendingStatus(): StatusQueueItem[] {
  return db.prepare("SELECT id, image_path, caption FROM status_queue WHERE sent = 0 ORDER BY created_at ASC").all() as StatusQueueItem[];
}

export function markStatusSent(id: number, contactsCount = 0): void {
  db.prepare("UPDATE status_queue SET sent = 1, contacts_count = ? WHERE id = ?").run(contactsCount, id);
}

export function getStatusHistory(limit = 50): StatusHistoryItem[] {
  return db.prepare(
    "SELECT id, image_path, caption, sent, contacts_count, created_at FROM status_queue ORDER BY created_at DESC LIMIT ?"
  ).all(limit) as StatusHistoryItem[];
}

export function deleteStatusItem(id: number): void {
  db.prepare("DELETE FROM status_queue WHERE id = ?").run(id);
}

export function getAllContactJids(): string[] {
  // Use phone_alias (resolved real phone) when available; fall back to phone only if ≤13 digits (real phone, not LID)
  const rows = db.prepare("SELECT phone, phone_alias FROM conversations").all() as { phone: string; phone_alias: string | null }[];
  const jids: string[] = [];
  for (const r of rows) {
    const alias = r.phone_alias?.replace(/^\+/, "");
    if (alias && alias.length <= 13) {
      jids.push(`${alias}@s.whatsapp.net`);
    } else if (r.phone.length <= 13) {
      jids.push(`${r.phone}@s.whatsapp.net`);
    }
  }
  return jids;
}

// --- Settings / System Prompt ---

export function getSystemPrompt(): { text: string; updatedAt: number } {
  const row = db
    .prepare("SELECT value, updated_at FROM settings WHERE key = 'system_prompt'")
    .get() as { value: string; updated_at: number } | undefined;

  if (!row || row.value === "__INITIAL__") {
    const { INITIAL_SYSTEM_PROMPT } = require("./system-prompt");
    db.prepare(
      "UPDATE settings SET value = ?, updated_at = unixepoch() WHERE key = 'system_prompt'"
    ).run(INITIAL_SYSTEM_PROMPT);
    return { text: INITIAL_SYSTEM_PROMPT, updatedAt: Math.floor(Date.now() / 1000) };
  }

  return { text: row.value, updatedAt: row.updated_at };
}

export function getWebhookUrl(): string {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = 'n8n_webhook_url'")
    .get() as { value: string } | undefined;
  return row?.value ?? "";
}

export function setWebhookUrl(url: string): void {
  db.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES ('n8n_webhook_url', ?, unixepoch()) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()"
  ).run(url);
}

export function getInventarioWebhookUrl(): string {
  return getSetting("n8n_webhook_inventario");
}

export function setInventarioWebhookUrl(url: string): void {
  setSetting("n8n_webhook_inventario", url);
}

export function getContabilidadWebhookUrl(): string {
  return getSetting("n8n_webhook_contabilidad");
}

export function setContabilidadWebhookUrl(url: string): void {
  setSetting("n8n_webhook_contabilidad", url);
}

export function getVendedoraWebhookUrl(): string {
  return getSetting("n8n_webhook_vendedora");
}

export function setVendedoraWebhookUrl(url: string): void {
  setSetting("n8n_webhook_vendedora", url);
}

export function getGoogleSheetId(): string {
  return getSetting("google_sheet_id") || "1srqMvqVqqF4Hblk611Rrdl_IS1mFQvS1UMkFo2yiv7M";
}

export function setGoogleSheetId(id: string): void {
  setSetting("google_sheet_id", id);
}

export function setSystemPrompt(text: string): void {
  db.prepare(
    "UPDATE settings SET value = ?, updated_at = unixepoch() WHERE key = 'system_prompt'"
  ).run(text);
}

// ─── Enzona settings ─────────────────────────────────────────────────────────
function getSetting(key: string): string {
  return (db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined)?.value ?? "";
}
function setSetting(key: string, value: string): void {
  db.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,unixepoch()) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=unixepoch()").run(key, value);
}

export function getEnzonaConfig(): { consumerKey: string; consumerSecret: string; merchantUuid: string } {
  return { consumerKey: getSetting("enzona_consumer_key"), consumerSecret: getSetting("enzona_consumer_secret"), merchantUuid: getSetting("enzona_merchant_uuid") };
}
export function setEnzonaConfig(consumerKey: string, consumerSecret: string, merchantUuid: string): void {
  setSetting("enzona_consumer_key", consumerKey);
  setSetting("enzona_consumer_secret", consumerSecret);
  setSetting("enzona_merchant_uuid", merchantUuid);
}

// ─── Payments ────────────────────────────────────────────────────────────────
export interface Payment {
  id: number;
  conversation_id: number;
  transaction_uuid: string;
  merchant_op_id: string;
  amount: number;
  description: string;
  status: "pending" | "completed" | "cancelled" | "failed";
  link_confirm: string | null;
  created_at: number;
}

export function createPaymentRecord(p: { conversationId: number; transactionUuid: string; merchantOpId: string; amount: number; description: string; linkConfirm: string }): Payment {
  return db.prepare(
    "INSERT INTO payments (conversation_id,transaction_uuid,merchant_op_id,amount,description,link_confirm) VALUES (?,?,?,?,?,?) RETURNING *"
  ).get(p.conversationId, p.transactionUuid, p.merchantOpId, p.amount, p.description, p.linkConfirm) as Payment;
}

export function getPaymentsByConversation(conversationId: number): Payment[] {
  return db.prepare("SELECT * FROM payments WHERE conversation_id = ? ORDER BY created_at DESC").all(conversationId) as Payment[];
}

export function updatePaymentStatus(transactionUuid: string, status: Payment["status"]): void {
  db.prepare("UPDATE payments SET status = ? WHERE transaction_uuid = ?").run(status, transactionUuid);
}

export default db;

// ─── Store products ───────────────────────────────────────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT NOT NULL,
  categoria  TEXT NOT NULL DEFAULT '',
  udm        TEXT NOT NULL DEFAULT '',
  stock      REAL NOT NULL DEFAULT 0,
  precio     REAL NOT NULL DEFAULT 0,
  activo     INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
)`).run();

try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_products_nombre ON products(nombre)").run(); } catch {}

export interface Product {
  id: number;
  nombre: string;
  categoria: string;
  udm: string;
  stock: number;
  precio: number;
  activo: number;
  imagen: string | null;
  created_at: number;
  updated_at: number;
}

export function listProducts(): Product[] {
  return db.prepare("SELECT * FROM products ORDER BY categoria, nombre").all() as Product[];
}

export function getProduct(id: number): Product | undefined {
  return db.prepare("SELECT * FROM products WHERE id = ?").get(id) as Product | undefined;
}

export function listActiveProducts(): Product[] {
  return db.prepare("SELECT * FROM products WHERE activo = 1 AND stock > 0 ORDER BY categoria, nombre").all() as Product[];
}

export function createProduct(p: Omit<Product, "id" | "created_at" | "updated_at">): Product {
  return db.prepare(
    "INSERT INTO products (nombre, categoria, udm, stock, precio, activo) VALUES (?,?,?,?,?,?) RETURNING *"
  ).get(p.nombre, p.categoria, p.udm, p.stock, p.precio, p.activo) as Product;
}

export function updateProduct(id: number, p: Partial<Omit<Product, "id" | "created_at" | "updated_at">>): void {
  const setClauses = Object.keys(p).map(k => `${k} = ?`).join(", ");
  const vals = [...Object.values(p), id];
  db.prepare(`UPDATE products SET ${setClauses}, updated_at = unixepoch() WHERE id = ?`).run(...vals);
}

export function deleteProduct(id: number): void {
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
}

export function upsertProductByName(p: Omit<Product, "id" | "activo" | "imagen" | "created_at" | "updated_at">): void {
  db.prepare(`
    INSERT INTO products (nombre, categoria, udm, stock, precio)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(nombre) DO UPDATE SET
      categoria  = excluded.categoria,
      udm        = excluded.udm,
      stock      = excluded.stock,
      precio     = excluded.precio,
      updated_at = unixepoch()
  `).run(p.nombre, p.categoria, p.udm, p.stock, p.precio);
}

// Migration: imagen column
try { db.prepare("ALTER TABLE products ADD COLUMN imagen TEXT").run(); } catch {}

// ─── Conversation notes ───────────────────────────────────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS conversation_notes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id    INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id            INTEGER NOT NULL REFERENCES users(id),
  username_snapshot  TEXT NOT NULL,
  content            TEXT NOT NULL,
  created_at         INTEGER NOT NULL DEFAULT (unixepoch())
)`).run();

export interface ConversationNote {
  id: number;
  conversation_id: number;
  user_id: number;
  username_snapshot: string;
  content: string;
  created_at: number;
}

export function getNotesByConversation(conversationId: number): ConversationNote[] {
  return db.prepare("SELECT * FROM conversation_notes WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId) as ConversationNote[];
}

export function insertNote(conversationId: number, userId: number, username: string, content: string): ConversationNote {
  return db.prepare(
    "INSERT INTO conversation_notes (conversation_id, user_id, username_snapshot, content) VALUES (?,?,?,?) RETURNING *"
  ).get(conversationId, userId, username, content) as ConversationNote;
}

export function deleteNote(noteId: number): void {
  db.prepare("DELETE FROM conversation_notes WHERE id = ?").run(noteId);
}

// ─── Quick replies ────────────────────────────────────────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS quick_replies (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'General',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
)`).run();

// Seed default quick replies
const _qrCount = (db.prepare("SELECT COUNT(*) as c FROM quick_replies").get() as { c: number }).c;
if (_qrCount === 0) {
  const seeds = [
    { title: "Saludo inicial", content: "¡Hola {nombre}! ¿En qué le puedo ayudar hoy?", category: "General" },
    { title: "Cobro Enzona", content: "Para completar su pedido puede pagar por Enzona en el siguiente enlace:", category: "Cobros" },
    { title: "Precio arroz", content: "El arroz está a {precio} CUP por libra. ¿Cuántas libras necesita?", category: "Precios" },
    { title: "Pedido en camino", content: "Su pedido está siendo preparado y llegará en breve. Cualquier duda estamos aquí.", category: "Pedidos" },
    { title: "Fuera de horario", content: "Estamos fuera de horario en este momento. Le atenderemos mañana a partir de las 8:00 AM.", category: "General" },
  ];
  const stmt = db.prepare("INSERT INTO quick_replies (title, content, category, sort_order) VALUES (?,?,?,?)");
  seeds.forEach((s, i) => stmt.run(s.title, s.content, s.category, i));
}

export interface QuickReply {
  id: number;
  title: string;
  content: string;
  category: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export function listQuickReplies(): QuickReply[] {
  return db.prepare("SELECT * FROM quick_replies ORDER BY sort_order, title").all() as QuickReply[];
}

export function createQuickReply(r: Pick<QuickReply, "title" | "content" | "category">): QuickReply {
  return db.prepare(
    "INSERT INTO quick_replies (title, content, category) VALUES (?,?,?) RETURNING *"
  ).get(r.title, r.content, r.category) as QuickReply;
}

export function updateQuickReply(id: number, r: Partial<Pick<QuickReply, "title" | "content" | "category" | "sort_order">>): void {
  const sets = Object.keys(r).map(k => `${k} = ?`).join(", ");
  db.prepare(`UPDATE quick_replies SET ${sets}, updated_at = unixepoch() WHERE id = ?`).run(...Object.values(r), id);
}

export function deleteQuickReply(id: number): void {
  db.prepare("DELETE FROM quick_replies WHERE id = ?").run(id);
}

// ─── Payment reminders ────────────────────────────────────────────────────────
try { db.prepare("ALTER TABLE payments ADD COLUMN reminded_at INTEGER").run(); } catch {}

export interface PendingReminder {
  id: number;
  conversation_id: number;
  phone: string;
  amount: number;
  description: string;
  link_confirm: string | null;
  created_at: number;
}

export function getPendingPaymentsToRemind(): PendingReminder[] {
  const cutoff = Math.floor(Date.now() / 1000) - 86400; // 24h ago
  return db.prepare(`
    SELECT p.id, p.conversation_id, c.phone, p.amount, p.description, p.link_confirm, p.created_at
    FROM payments p
    JOIN conversations c ON c.id = p.conversation_id
    WHERE p.status = 'pending'
      AND p.created_at < ?
      AND p.reminded_at IS NULL
  `).all(cutoff) as PendingReminder[];
}

export function markPaymentReminded(id: number): void {
  db.prepare("UPDATE payments SET reminded_at = unixepoch() WHERE id = ?").run(id);
}

// ─── Contact tags ─────────────────────────────────────────────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS contact_tags (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag             TEXT NOT NULL,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(conversation_id, tag)
)`).run();

export function getTagsByConversation(conversationId: number): string[] {
  return (db.prepare("SELECT tag FROM contact_tags WHERE conversation_id = ? ORDER BY tag").all(conversationId) as { tag: string }[]).map(r => r.tag);
}

export function addTag(conversationId: number, tag: string): void {
  db.prepare("INSERT OR IGNORE INTO contact_tags (conversation_id, tag) VALUES (?,?)").run(conversationId, tag.trim().toLowerCase());
}

export function removeTag(conversationId: number, tag: string): void {
  db.prepare("DELETE FROM contact_tags WHERE conversation_id = ? AND tag = ?").run(conversationId, tag);
}

export function getAllTags(): { tag: string; count: number }[] {
  return db.prepare("SELECT tag, COUNT(*) as count FROM contact_tags GROUP BY tag ORDER BY count DESC, tag").all() as { tag: string; count: number }[];
}

export function getConversationsByTag(tag: string): number[] {
  return (db.prepare("SELECT conversation_id FROM contact_tags WHERE tag = ?").all(tag) as { conversation_id: number }[]).map(r => r.conversation_id);
}

// ─── Admin phone ──────────────────────────────────────────────────────────────
db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_phone', '')").run();

export function getAdminPhone(): string {
  return getSetting("admin_phone");
}
export function setAdminPhone(phone: string): void {
  setSetting("admin_phone", phone.trim().replace(/\D/g, ""));
}

export function findProductByName(nombre: string): Product | undefined {
  return (
    db.prepare("SELECT * FROM products WHERE lower(nombre) = lower(?)").get(nombre) ??
    db.prepare("SELECT * FROM products WHERE lower(nombre) LIKE lower(?) LIMIT 1").get(`%${nombre}%`)
  ) as Product | undefined;
}


