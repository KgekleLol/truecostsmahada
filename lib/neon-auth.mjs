import { neon } from "@neondatabase/serverless";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;
const COOKIE = "tc_session";

export const sql = neon(process.env.DATABASE_URL);

export function cleanUsername(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(key).toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [salt, encoded] = String(stored ?? "").split(":");
  if (!salt || !encoded) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(encoded, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function readCookie(request, name) {
  const cookies = request.headers.cookie || "";
  const match = cookies.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function sessionCookie(token, maxAge) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return sessionCookie("", 0);
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL);
  await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expiresAt})`;
  return { token, maxAge: Math.floor(SESSION_TTL / 1000) };
}

export async function currentUser(request) {
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  const rows = await sql`
    SELECT u.id, u.username
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW()
    LIMIT 1
  `;
  return rows[0] || null;
}

export function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

export function requestBody(request) {
  return request.body && typeof request.body === "object" ? request.body : {};
}

export async function deleteSession(request) {
  const token = readCookie(request, COOKIE);
  if (token) await sql`DELETE FROM sessions WHERE token = ${token}`;
}

export { COOKIE };
