import { cleanUsername, createSession, ensureSchema, hashPassword, sessionCookie, sql, send, requestBody } from "../../lib/neon-auth.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") return send(response, 405, { error: "Metode tidak diizinkan." });
  try {
    await ensureSchema();
    const body = requestBody(request);
    const username = cleanUsername(body.username);
    const password = String(body.password || "");

    if (!username || username.length < 3) {
      return send(response, 400, { error: "Username minimal 3 karakter alfanumerik atau garis bawah." });
    }
    if (username.length > 50) {
      return send(response, 400, { error: "Username maksimal 50 karakter." });
    }
    if (!password || password.length < 6) {
      return send(response, 400, { error: "Password minimal 6 karakter." });
    }

    const existing = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${username}) LIMIT 1`;
    if (existing.length) {
      return send(response, 409, { error: "Username sudah digunakan, silakan pilih yang lain." });
    }

    const hash = await hashPassword(password);
    const [user] = await sql`
      INSERT INTO users (username, password_hash, password) 
      VALUES (${username}, ${hash}, ${hash}) 
      RETURNING id, username
    `;

    const session = await createSession(user.id);
    return send(
      response,
      201,
      { success: true, message: "Pendaftaran berhasil!", user: { username: user.username } },
      { "Set-Cookie": sessionCookie(session.token, session.maxAge) }
    );
  } catch (error) {
    console.error("Register error:", error);
    if (error?.code === "23505" || String(error?.message).toLowerCase().includes("unique")) {
      return send(response, 409, { error: "Username sudah digunakan, silakan pilih yang lain." });
    }
    return send(response, 500, { error: "Akun gagal dibuat. Coba lagi." });
  }
}
