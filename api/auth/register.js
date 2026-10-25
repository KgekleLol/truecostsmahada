import { cleanUsername, createSession, hashPassword, sessionCookie, sql } from "../../lib/neon-auth.mjs";

export default async function handler(request) {
  if (request.method !== "POST") return Response.json({ error: "Metode tidak diizinkan." }, { status: 405 });
  try {
    const body = await request.json();
    const username = cleanUsername(body.username);
    const password = String(body.password || "");
    if (username.length < 3) return Response.json({ error: "Username minimal 3 karakter." }, { status: 400 });
    if (password.length < 6) return Response.json({ error: "Password minimal 6 karakter." }, { status: 400 });
    const existing = await sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`;
    if (existing.length) return Response.json({ error: "Username sudah digunakan." }, { status: 409 });
    const [user] = await sql`INSERT INTO users (username, password_hash) VALUES (${username}, ${await hashPassword(password)}) RETURNING id, username`;
    const session = await createSession(user.id);
    return new Response(JSON.stringify({ user: { username: user.username } }), {
      status: 201,
      headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(session.token, session.maxAge) },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Akun gagal dibuat. Coba lagi." }, { status: 500 });
  }
}
