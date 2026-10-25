import { cleanUsername, createSession, sessionCookie, sql, verifyPassword, send, requestBody } from "../../lib/neon-auth.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") return send(response, 405, { error: "Metode tidak diizinkan." });
  try {
    const body = requestBody(request);
    const username = cleanUsername(body.username);
    const rows = await sql`SELECT id, username, password_hash FROM users WHERE username = ${username} LIMIT 1`;
    if (!rows[0] || !(await verifyPassword(String(body.password || ""), rows[0].password_hash))) {
      return send(response, 401, { error: "Username atau password salah." });
    }
    const session = await createSession(rows[0].id);
    return send(response, 200, { user: { username: rows[0].username } }, { "Set-Cookie": sessionCookie(session.token, session.maxAge) });
  } catch (error) {
    console.error(error);
    return send(response, 500, { error: "Login gagal. Coba lagi." });
  }
}
