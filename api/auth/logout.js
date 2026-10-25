import { clearSessionCookie, deleteSession, ensureSchema, send } from "../../lib/neon-auth.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") return send(response, 405, { error: "Metode tidak diizinkan." });
  await ensureSchema();
  await deleteSession(request);
  return send(response, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
}
