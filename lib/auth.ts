import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions, users } from "../db/schema.js";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "tc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function sanitizeUsername(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [salt, key] = String(stored ?? "").split(":");
  if (!salt || !key) return false;
  const derived = await scrypt(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  const actual = Buffer.from(derived);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ token, userId, expiresAt });
  return { token, expiresAt };
}

export function readSessionToken(req) {
  const cookie = req.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return null;
}

export async function getSessionUser(req) {
  const token = readSessionToken(req);
  if (!token) return null;
  const rows = await db
    .select({ id: users.id, username: users.username })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteSession(req) {
  const token = readSessionToken(req);
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
}

export function buildSessionCookie(token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function buildClearedCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
