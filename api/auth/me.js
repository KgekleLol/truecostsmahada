import { currentUser, ensureSchema, send } from "../../lib/neon-auth.mjs";

export default async function handler(request, response) {
  try {
    await ensureSchema();
    const user = await currentUser(request);
    return send(response, 200, { user: user ? { username: user.username } : null });
  } catch (error) {
    console.error(error);
    return send(response, 500, { error: "Sesi tidak dapat diperiksa." });
  }
}
