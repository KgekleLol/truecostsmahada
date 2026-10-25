import { cleanUsername, createSession, hashPassword, sessionCookie, sql, send, requestBody } from "../../lib/neon-auth.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") return send(response, 405, { error: "Metode tidak diizinkan." });
  try {
    const body = requestBody(request);
    const username = cleanUsername(body.username);
    const password = String(body.password || "");
    if (username.length < 3) return send(response, 400, { error: "Username minimal 3 karakter." });
    if (password.length < 6) return send(response, 400, { error: "Password minimal 6 karakter." });
    const existing = await sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`;
    if (existing.length) return send(response, 409, { error: "Username sudah digunakan." });
    const [user] = await sql`INSERT INTO users (username, password_hash) VALUES (${username}, ${await hashPassword(password)}) RETURNING id, username`;
    const session = await createSession(user.id);
    return send(response, 201, { user: { username: user.username } }, { "Set-Cookie": sessionCookie(session.token, session.maxAge) });
  } catch (error) {
    console.error(error);
    return send(response, 500, { error: "Akun gagal dibuat. Coba lagi." });
  }
}
