import type { Config } from "@netlify/functions";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { habitLogs } from "../../db/schema.js";
import { getSessionUser } from "../../lib/auth.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function toDto(row) {
  return {
    id: String(row.id),
    productKey: row.productKey,
    productName: row.productName,
    decision: row.decision,
    carbonGrams: Number(row.carbonGrams),
    plasticGrams: Number(row.plasticGrams),
    sugarGrams: Number(row.sugarGrams),
    sodiumMg: Number(row.sodiumMg),
    timezone: row.timezone,
    scannedAt:
      row.scannedAt instanceof Date ? row.scannedAt.toISOString() : String(row.scannedAt),
  };
}

async function handleGet(user) {
  const rows = await db
    .select()
    .from(habitLogs)
    .where(eq(habitLogs.userId, user.id))
    .orderBy(desc(habitLogs.scannedAt))
    .limit(400);
  return json({ logs: rows.map(toDto) });
}

async function handlePost(req, user) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Data yang dikirim tidak valid." }, 400);
  }

  const decision = body.decision === "cancelled" ? "cancelled" : "purchased";
  const scannedAt = body.scannedAt ? new Date(body.scannedAt) : new Date();
  if (Number.isNaN(scannedAt.getTime())) {
    return json({ error: "Tanggal aktivitas tidak valid." }, 400);
  }

  const [row] = await db
    .insert(habitLogs)
    .values({
      userId: user.id,
      productKey: String(body.productKey ?? "unknown"),
      productName: String(body.productName ?? "Produk"),
      decision,
      carbonGrams: Math.round(Number(body.carbonGrams) || 0),
      plasticGrams: Number(body.plasticGrams) || 0,
      sugarGrams: Number(body.sugarGrams) || 0,
      sodiumMg: Math.round(Number(body.sodiumMg) || 0),
      timezone: String(body.timezone || "Waktu lokal"),
      scannedAt,
    })
    .returning();

  return json({ log: toDto(row) }, 201);
}

export default async (req) => {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return json({ error: "Sesi tidak valid. Silakan masuk kembali." }, 401);
    }
    if (req.method === "GET") return await handleGet(user);
    if (req.method === "POST") return await handlePost(req, user);
    return json({ error: "Metode tidak diizinkan." }, 405);
  } catch (error) {
    console.error("logs handler error:", error);
    return json({ error: "Data belum tersimpan. Silakan coba lagi." }, 500);
  }
};

export const config: Config = {
  path: "/api/logs",
};
