import { allowedDomains, googleConfigured, publicOrigin, signValue } from "@/lib/auth";

const STATE_COOKIE = "brian_oauth";

/** Start Google sign-in. The state cookie ties the callback to this browser and carries where to go next. */
export async function GET(req: Request) {
  if (!googleConfigured()) return new Response("Google sign-in isn't configured.", { status: 400 });
  const u = new URL(req.url);
  const nextParam = u.searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${publicOrigin(req)}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    hd: allowedDomains()[0],
    prompt: "select_account",
  });
  const cookie = await signValue(JSON.stringify({ state, nonce, next }), process.env.BRIAN_SESSION_SECRET!);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "Set-Cookie": `${STATE_COOKIE}=${cookie}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=600${secure}`,
    },
  });
}
