import { allowedDomains, checkGoogleClaims, cookieValue, createSession, googleConfigured, publicOrigin, readSigned, SESSION_COOKIE, SESSION_MAX_AGE, type GoogleClaims } from "@/lib/auth";

const STATE_COOKIE = "brian_oauth";

function back(origin: string, error: string, extra: string[] = []) {
  return new Response(null, {
    status: 302,
    headers: [
      ["Location", `${origin}/login?error=${error}`],
      ["Set-Cookie", `${STATE_COOKIE}=; Path=/api/auth/google; Max-Age=0`],
      ...extra.map((c) => ["Set-Cookie", c] as [string, string]),
    ],
  });
}

/** Google sends the user back here. Exchange the code, check who it is, start a session. */
export async function GET(req: Request) {
  const origin = publicOrigin(req);
  if (!googleConfigured()) return back(origin, "not-configured");
  const u = new URL(req.url);
  if (u.searchParams.get("error")) return back(origin, "cancelled");
  const raw = await readSigned(cookieValue(req.headers.get("cookie"), STATE_COOKIE), process.env.BRIAN_SESSION_SECRET!);
  const saved = raw ? (JSON.parse(raw) as { state: string; nonce: string; next: string }) : null;
  const code = u.searchParams.get("code");
  if (!saved || !code || u.searchParams.get("state") !== saved.state) return back(origin, "state");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokens = (await res.json().catch(() => ({}))) as { id_token?: string };
  if (!res.ok || !tokens.id_token) return back(origin, "google");
  let claims: GoogleClaims;
  try {
    claims = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return back(origin, "google");
  }
  const check = checkGoogleClaims(claims, { clientId: process.env.GOOGLE_CLIENT_ID!, nonce: saved.nonce, domains: allowedDomains() });
  if (!check.ok) return back(origin, check.reason === "domain" ? "domain" : "google");

  const token = await createSession(check.email, process.env.BRIAN_SESSION_SECRET!);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return new Response(null, {
    status: 302,
    headers: [
      ["Location", `${origin}${saved.next}`],
      ["Set-Cookie", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`],
      ["Set-Cookie", `${STATE_COOKIE}=; Path=/api/auth/google; Max-Age=0`],
    ],
  });
}
