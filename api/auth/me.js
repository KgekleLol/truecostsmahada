import { currentUser } from "../../lib/neon-auth.mjs";

export default async function handler(request) {
  try {
    const user = await currentUser(request);
    return Response.json({ user: user ? { username: user.username } : null });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Sesi tidak dapat diperiksa." }, { status: 500 });
  }
}
