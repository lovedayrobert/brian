import { ModelUnavailableError, SpendCapError } from "@/lib/adapters/model";
import { RedLineError } from "@/lib/pipeline/ideas";
import { userFromRequest } from "@/lib/auth";
import { rememberActor, setActor } from "@/lib/actor";
import { isAdmin, touchPerson } from "@/lib/people";

export function fail(e: unknown, status = 400) {
  const err = e as Error;
  const code = e instanceof ModelUnavailableError ? 503 : e instanceof SpendCapError ? 429 : e instanceof RedLineError ? 422 : status;
  return Response.json({ error: err.message }, { status: code });
}

/** Second gate behind the proxy: every API action checks the session itself. */
export async function requireUser(req: Request): Promise<Response | null> {
  const user = await userFromRequest(req);
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  rememberActor(req, user);
  await touchPerson(user);
  return null;
}

/** Admin-only actions (editing Memory, settings). Admins are BRIAN_ADMINS. */
export async function requireAdmin(req: Request): Promise<Response | null> {
  const denied = await requireUser(req);
  if (denied) return denied;
  const user = await userFromRequest(req);
  return isAdmin(user) ? null : Response.json({ error: "Only admins can change this." }, { status: 403 });
}

export { setActor };
