import { currentUser, ensureSchema, sql, send, requestBody } from "../lib/neon-auth.mjs";

export default async function handler(request, response) {
  try {
    await ensureSchema();
    const user = await currentUser(request);
    if (!user) return send(response, 401, { error: "Sesi tidak valid. Silakan masuk kembali." });
    if (request.method === "GET") {
      const logs = await sql`SELECT id, product_key AS "productKey", product_name AS "productName", decision, carbon_grams AS "carbonGrams", plastic_grams AS "plasticGrams", sugar_grams AS "sugarGrams", sodium_mg AS "sodiumMg", timezone, scanned_at AS "scannedAt" FROM habit_logs WHERE user_id = ${user.id} ORDER BY scanned_at DESC LIMIT 400`;
      return send(response, 200, { logs });
    }
    if (request.method === "POST") {
      const body = requestBody(request);
      const [log] = await sql`INSERT INTO habit_logs (user_id, product_key, product_name, decision, carbon_grams, plastic_grams, sugar_grams, sodium_mg, timezone, scanned_at) VALUES (${user.id}, ${String(body.productKey || "unknown")}, ${String(body.productName || "Produk")}, ${body.decision === "cancelled" ? "cancelled" : "purchased"}, ${Math.round(Number(body.carbonGrams) || 0)}, ${Number(body.plasticGrams) || 0}, ${Number(body.sugarGrams) || 0}, ${Math.round(Number(body.sodiumMg) || 0)}, ${String(body.timezone || "Waktu lokal")}, ${new Date(body.scannedAt || Date.now())}) RETURNING *`;
      return send(response, 201, { log });
    }
    return send(response, 405, { error: "Metode tidak diizinkan." });
  } catch (error) {
    console.error(error);
    return send(response, 500, { error: "Data belum tersimpan. Coba lagi." });
  }
}
