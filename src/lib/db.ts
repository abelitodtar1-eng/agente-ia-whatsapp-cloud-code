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
    status TEXT CHECK(status IN ('disconnected','qr','connecting','connected')) NOT NULL DEFAULT 'disconnected',
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

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('system_prompt', '__INITIAL__');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('n8n_webhook_url', '');
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
  status: "disconnected" | "qr" | "connecting" | "connected";
  qr_string: string | null;
  phone: string | null;
  updated_at: number;
}

// --- Conversations ---

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
  const result = db
    .prepare("INSERT INTO conversations (phone, name) VALUES (?, ?) RETURNING *")
    .get(phone, name ?? null) as Conversation;
  return result;
}

export function listConversations(): Conversation[] {
  return db
    .prepare("SELECT * FROM conversations ORDER BY last_message_at DESC NULLS LAST, created_at DESC")
    .all() as Conversation[];
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

export function upsertProductByName(p: Omit<Product, "id" | "activo" | "created_at" | "updated_at">): void {
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
