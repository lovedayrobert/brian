import { ModelUnavailableError, SpendCapError } from "@/lib/adapters/model";
import { RedLineError } from "@/lib/pipeline/ideas";
import { userFromRequest } from "@/lib/auth";

export function fail(e: unknown, status = 400) {
  const err = e as Error;
  const code = e instanceof ModelUnavailableError ? 503 : e instanceof SpendCapError ? 429 : e instanceof RedLineError ? 422 : status;
  return Response.json({ error: err.message }, { status: code });
}

/** Second gate behind the proxy: every API action checks the session itself. */
export async function requireUser(req: Request): Promise<Response | null> {
  return (await userFromRequest(req)) ? null : Response.json({ error: "Sign in required" }, { status: 401 });
}
