/**
 * Login. Users and passwords come from BRIAN_USERS ("name:password,name2:password2");
 * sessions are HMAC-signed cookies (BRIAN_SESSION_SECRET). Web Crypto only, so
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

export function authMode(env: Record<string, string | undefined> = process.env): AuthMode {
  const configured = !!env.BRIAN_USERS?.trim() && (env.BRIAN_SESSION_SECRET?.length ?? 0) >= 32;
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
