/**
 * Login. Two ways in:
 *  - Google (the team's way): GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET, and only
 *    verified accounts on BRIAN_ALLOWED_DOMAINS (default bitstarz.com) get in.
 *    Once Google is set up, passwords are switched off unless BRIAN_ALLOW_PASSWORDS=1.
 *  - Passwords from BRIAN_USERS ("name:password,name2:password2").
 * Sessions are HMAC-signed cookies (BRIAN_SESSION_SECRET). Web Crypto only, so
 * the same code runs in the proxy and in route handlers.
 *
 * Secure by default: in production, if login isn't configured, every request
 * is refused. In local development login is optional and the app says so.
 */
export const SESSION_COOKIE = "brian_session";
const SESSION_DAYS = 7;

export interface Session {
  user: string;
  exp: number; // ms since epoch
}

export type AuthMode = "on" | "off-dev" | "misconfigured";

type Env = Record<string, string | undefined>;

export function googleConfigured(env: Env = process.env): boolean {
  return !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
}

export function passwordsEnabled(env: Env = process.env): boolean {
  return !!env.BRIAN_USERS?.trim() && (!googleConfigured(env) || env.BRIAN_ALLOW_PASSWORDS === "1");
}

export function allowedDomains(env: Env = process.env): string[] {
  return (env.BRIAN_ALLOWED_DOMAINS || "bitstarz.com").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
}

export function authMode(env: Env = process.env): AuthMode {
  const configured = (passwordsEnabled(env) || googleConfigured(env)) && (env.BRIAN_SESSION_SECRET?.length ?? 0) >= 32;
  if (configured) return "on";
  return env.NODE_ENV === "production" ? "misconfigured" : "off-dev";
}

export function parseUsers(raw: string | undefined): Map<string, string> {
  const users = new Map<string, string>();
  for (const pair of (raw ?? "").split(",")) {
    const i = pair.indexOf(":");
    if (i <= 0) continue;
    const name = pair.slice(0, i).trim().toLowerCase();
    const pass = pair.slice(i + 1).trim();
    if (name && pass) users.set(name, pass);
  }
  return users;
}

const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(new Uint8Array(sig));
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): string {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

/** Constant-time comparison so response timing doesn't leak how much of a secret matched. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function createSession(user: string, secret: string, now = Date.now()): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ user, exp: now + SESSION_DAYS * 86_400_000 } satisfies Session)));
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifySession(token: string | undefined, secret: string, now = Date.now()): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!safeEqual(sig, await hmac(secret, payload))) return null;
  try {
    const s = JSON.parse(fromB64url(payload)) as Session;
    if (typeof s.user !== "string" || typeof s.exp !== "number" || s.exp < now) return null;
    return s;
  } catch {
    return null;
  }
}

/** Sign any short value (used for the Google sign-in state cookie). */
export async function signValue(value: string, secret: string): Promise<string> {
  const payload = b64url(enc.encode(value));
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function readSigned(token: string | undefined, secret: string): Promise<string | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, await hmac(secret, payload))) return null;
  try {
    return new TextDecoder().decode(Uint8Array.from(fromB64url(payload), (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

export interface GoogleClaims {
  iss?: string;
  aud?: string;
  exp?: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  hd?: string;
}

/**
 * Who Google says this is, and whether they're allowed in. The ID token came
 * straight from Google's token endpoint over TLS, so its claims are checked
 * rather than its signature (Google's documented approach for this flow).
 */
export function checkGoogleClaims(c: GoogleClaims, o: { clientId: string; nonce: string; domains: string[]; now?: number }): { ok: true; email: string } | { ok: false; reason: string } {
  const now = (o.now ?? Date.now()) / 1000;
  if (c.iss !== "https://accounts.google.com" && c.iss !== "accounts.google.com") return { ok: false, reason: "issuer" };
  if (c.aud !== o.clientId) return { ok: false, reason: "audience" };
  if (!c.exp || c.exp < now) return { ok: false, reason: "expired" };
  if (!c.nonce || !safeEqual(c.nonce, o.nonce)) return { ok: false, reason: "nonce" };
  const email = c.email?.toLowerCase();
  if (!email || c.email_verified !== true) return { ok: false, reason: "unverified" };
  const domain = email.split("@")[1];
  // Both the email's domain and Google's hosted-domain claim must be on the list, so personal Gmail can't get in.
  if (!o.domains.includes(domain) || !c.hd || !o.domains.includes(c.hd.toLowerCase())) return { ok: false, reason: "domain" };
  return { ok: true, email };
}

export function checkPassword(users: Map<string, string>, name: string, password: string): boolean {
  const expected = users.get(name.trim().toLowerCase());
  // Compare against a dummy when the user doesn't exist, so timing doesn't reveal valid names.
  return safeEqual(expected ?? "\u0000invalid-user-padding\u0000", password) && expected !== undefined;
}

export function cookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/** Route-handler check (defence in depth behind the proxy). */
export async function userFromRequest(req: Request): Promise<string | null> {
  const mode = authMode();
  if (mode === "off-dev") return "local";
  if (mode === "misconfigured") return null;
  const s = await verifySession(cookieValue(req.headers.get("cookie"), SESSION_COOKIE), process.env.BRIAN_SESSION_SECRET!);
  return s?.user ?? null;
}

export const SESSION_MAX_AGE = SESSION_DAYS * 86_400;

/** The address Google sends people back to: BRIAN_PUBLIC_URL, or the request's own host behind the proxy. */
export function publicOrigin(req: Request): string {
  if (process.env.BRIAN_PUBLIC_URL) return process.env.BRIAN_PUBLIC_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}


/** A friendly first name for the signed-in person ("rob.loveday@bitstarz.com" → "Rob"). */
export function firstName(user: string | null | undefined): string {
  const base = (user ?? "").split("@")[0].split(/[._-]/)[0];
  return base && base !== "local" ? base[0].toUpperCase() + base.slice(1) : "there";
}
