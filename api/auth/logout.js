import { clearSessionCookie, deleteSession } from "../../lib/neon-auth.mjs";

export default async function handler(request) {
  if (request.method !== "POST") return Response.json({ error: "Metode tidak diizinkan." }, { status: 405 });
  await deleteSession(request);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Set-Cookie": clearSessionCookie() },
  });
}
