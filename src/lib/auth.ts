import db from "./db";
import { scrypt, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const SESSION_TTL = 8 * 60 * 60; // 8 hours

export interface User {
  id: number;
  username: string;
  role: "admin" | "operator";
  created_at: number;
  last_login: number | null;
}

// ─── Password ─────────────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(hashBuf, Buffer.from(hash, "hex"));
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export function createSession(userId: number): string {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL;
  db.prepare("DELETE FROM sessions WHERE expires_at < unixepoch()").run();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt);
  return token;
}

export function getSessionUser(token: string): User | null {
  if (!token) return null;
  return (db.prepare(`
    SELECT u.id, u.username, u.role, u.created_at, u.last_login
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > unixepoch()
  `).get(token) as User | undefined) ?? null;
}

export function deleteSession(token: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
}

// ─── Users ────────────────────────────────────────────────────────────────────
export function listUsers(): User[] {
  return db.prepare("SELECT id, username, role, created_at, last_login FROM users ORDER BY id").all() as User[];
}

export function getUserByUsername(username: string): (User & { password_hash: string }) | null {
  return (db.prepare(
    "SELECT id, username, role, created_at, last_login, password_hash FROM users WHERE username = ?"
  ).get(username) as (User & { password_hash: string }) | undefined) ?? null;
}

export async function createUser(
  username: string, password: string, role: "admin" | "operator"
): Promise<User> {
  const hash = await hashPassword(password);
  return db.prepare(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) RETURNING id, username, role, created_at, last_login"
  ).get(username, hash, role) as User;
}

export async function updateUserPassword(userId: number, newPassword: string): Promise<void> {
  const hash = await hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);
}

export function updateUserRole(userId: number, role: "admin" | "operator"): void {
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
}

export function deleteUser(userId: number): void {
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
}

export function updateLastLogin(userId: number): void {
  db.prepare("UPDATE users SET last_login = unixepoch() WHERE id = ?").run(userId);
}
