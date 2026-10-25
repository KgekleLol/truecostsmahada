import { sql } from "../lib/neon-auth.mjs";

export default async function handler(request) {
  if (request.method !== "POST") return Response.json({ error: "Metode tidak diizinkan." }, { status: 405 });
  const secret = request.headers.get("x-setup-secret");
  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) return Response.json({ error: "Tidak diizinkan." }, { status: 403 });
  await sql`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS habit_logs (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, product_key TEXT NOT NULL, product_name TEXT NOT NULL, decision TEXT NOT NULL, carbon_grams INTEGER NOT NULL, plastic_grams REAL NOT NULL, sugar_grams REAL NOT NULL, sodium_mg INTEGER NOT NULL, timezone TEXT NOT NULL DEFAULT 'Waktu lokal', scanned_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  return Response.json({ ok: true });
}
