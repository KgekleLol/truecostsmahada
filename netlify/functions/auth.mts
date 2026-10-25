import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import {
  buildClearedCookie,
  buildSessionCookie,
  createSession,
  deleteSession,
  getSessionUser,
  hashPassword,
  sanitizeUsername,
  verifyPassword,
} from "../../lib/auth.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

async function readBody(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function handleRegister(req) {
  if (req.method !== "POST") return json({ error: "Metode tidak diizinkan." }, 405);
  const body = await readBody(req);
  const username = sanitizeUsername(body.username);
  const password = String(body.password ?? "");
  if (username.length < 3) {
    return json({ error: "Username minimal 3 karakter alfanumerik atau garis bawah." }, 400);
  }
  if (password.length < 6) {
    return json({ error: "Password minimal 6 karakter." }, 400);
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing.length) {
    return json({ error: "Username sudah digunakan, silakan pilih yang lain." }, 409);
  }

  const passwordHash = await hashPassword(password);
  let created;
  try {
    [created] = await db
      .insert(users)
      .values({ username, passwordHash })
      .returning({ id: users.id, username: users.username });
  } catch (error) {
    const code = error?.code ?? error?.cause?.code;
    if (String(code) === "23505") {
      return json({ error: "Username sudah digunakan, silakan pilih yang lain." }, 409);
    }
    throw error;
  }

  const { token, expiresAt } = await createSession(created.id);
  return json({ user: { username: created.username } }, 201, {
    "Set-Cookie": buildSessionCookie(token, expiresAt),
  });
}

async function handleLogin(req) {
  if (req.method !== "POST") return json({ error: "Metode tidak diizinkan." }, 405);
  const body = await readBody(req);
  const username = sanitizeUsername(body.username);
  const password = String(body.password ?? "");
  if (!username || !password) {
    return json({ error: "Username atau password salah. Silakan coba lagi." }, 401);
  }

  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const user = rows[0];
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    return json({ error: "Username atau password salah. Silakan coba lagi." }, 401);
  }

  const { token, expiresAt } = await createSession(user.id);
  return json({ user: { username: user.username } }, 200, {
    "Set-Cookie": buildSessionCookie(token, expiresAt),
  });
}

async function handleLogout(req) {
  await deleteSession(req);
  return json({ ok: true }, 200, { "Set-Cookie": buildClearedCookie() });
}

async function handleMe(req) {
  const user = await getSessionUser(req);
  return json({ user: user ? { username: user.username } : null }, 200);
}

export default async (req) => {
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  try {
    if (path.endsWith("/register")) return await handleRegister(req);
    if (path.endsWith("/login")) return await handleLogin(req);
    if (path.endsWith("/logout")) return await handleLogout(req);
    if (path.endsWith("/me")) return await handleMe(req);
    return json({ error: "Endpoint tidak ditemukan." }, 404);
  } catch (error) {
    console.error("auth handler error:", error);
    return json({ error: "Terjadi kesalahan pada server. Silakan coba lagi." }, 500);
  }
};

export const config: Config = {
  path: ["/api/auth/register", "/api/auth/login", "/api/auth/logout", "/api/auth/me"],
};
