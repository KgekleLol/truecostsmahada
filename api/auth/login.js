import { cleanUsername, createSession, sessionCookie, sql, verifyPassword } from "../../lib/neon-auth.mjs";

export default async function handler(request) {
  if (request.method !== "POST") return Response.json({ error: "Metode tidak diizinkan." }, { status: 405 });
  try {
    const body = await request.json();
    const username = cleanUsername(body.username);
    const rows = await sql`SELECT id, username, password_hash FROM users WHERE username = ${username} LIMIT 1`;
    if (!rows[0] || !(await verifyPassword(String(body.password || ""), rows[0].password_hash))) {
      return Response.json({ error: "Username atau password salah." }, { status: 401 });
    }
    const session = await createSession(rows[0].id);
    return new Response(JSON.stringify({ user: { username: rows[0].username } }), {
      headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(session.token, session.maxAge) },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Login gagal. Coba lagi." }, { status: 500 });
  }
}
