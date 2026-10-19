import { touchPerson } from "@/lib/people";
import { authMode, checkPassword, passwordsEnabled, createSession, parseUsers, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

// Slow down password guessing: 5 attempts a minute per address.
const attempts = new Map<string, number[]>();

export async function POST(req: Request) {
  if (authMode() !== "on") return Response.json({ error: "Login isn't configured on this server." }, { status: 400 });
  if (!passwordsEnabled()) return Response.json({ error: "Sign in with your BitStarz Google account." }, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 5) return Response.json({ error: "Too many attempts. Wait a minute and try again." }, { status: 429 });
  attempts.set(ip, [...recent, now]);

  const { name, password } = (await req.json().catch(() => ({}))) as { name?: string; password?: string };
  if (!name || !password || !checkPassword(parseUsers(process.env.BRIAN_USERS), name, password)) {
    return Response.json({ error: "Wrong name or password." }, { status: 401 });
  }
  await touchPerson(name.trim().toLowerCase(), {});
  const token = await createSession(name.trim().toLowerCase(), process.env.BRIAN_SESSION_SECRET!);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`,
    },
  });
}
