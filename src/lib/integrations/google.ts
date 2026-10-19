import { createSign } from "node:crypto";

/**
 * Google service-account sign-in (no SDK). One service account can read the
 * CRM sheet, GA4 and Search Console: add its email as a Viewer in each.
 * GOOGLE_SERVICE_ACCOUNT_JSON holds the whole key file.
 */
const cache = new Map<string, { token: string; exp: number }>();

export function serviceAccountReady(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
}

export function serviceAccountEmail(): string | null {
  try {
    return (JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "") as { client_email: string }).client_email;
  } catch {
    return null;
  }
}

export async function googleToken(scope: string): Promise<string> {
  const hit = cache.get(scope);
  if (hit && hit.exp > Date.now() + 60_000) return hit.token;
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  const j = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!j.access_token) throw new Error(`Google sign-in failed: ${j.error_description ?? res.status}`);
  cache.set(scope, { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 });
  return j.access_token;
}
