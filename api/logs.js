import { currentUser, sql } from "../lib/neon-auth.mjs";

export default async function handler(request) {
  try {
    const user = await currentUser(request);
    if (!user) return Response.json({ error: "Sesi tidak valid. Silakan masuk kembali." }, { status: 401 });
    if (request.method === "GET") {
      const logs = await sql`SELECT id, product_key AS "productKey", product_name AS "productName", decision, carbon_grams AS "carbonGrams", plastic_grams AS "plasticGrams", sugar_grams AS "sugarGrams", sodium_mg AS "sodiumMg", timezone, scanned_at AS "scannedAt" FROM habit_logs WHERE user_id = ${user.id} ORDER BY scanned_at DESC LIMIT 400`;
      return Response.json({ logs });
    }
    if (request.method === "POST") {
      const body = await request.json();
      const [log] = await sql`INSERT INTO habit_logs (user_id, product_key, product_name, decision, carbon_grams, plastic_grams, sugar_grams, sodium_mg, timezone, scanned_at) VALUES (${user.id}, ${String(body.productKey || "unknown")}, ${String(body.productName || "Produk")}, ${body.decision === "cancelled" ? "cancelled" : "purchased"}, ${Math.round(Number(body.carbonGrams) || 0)}, ${Number(body.plasticGrams) || 0}, ${Number(body.sugarGrams) || 0}, ${Math.round(Number(body.sodiumMg) || 0)}, ${String(body.timezone || "Waktu lokal")}, ${new Date(body.scannedAt || Date.now())}) RETURNING *`;
      return Response.json({ log }, { status: 201 });
    }
    return Response.json({ error: "Metode tidak diizinkan." }, { status: 405 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Data belum tersimpan. Coba lagi." }, { status: 500 });
  }
}
