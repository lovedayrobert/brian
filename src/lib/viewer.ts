import { cookies } from "next/headers";
import { authMode, SESSION_COOKIE, verifySession } from "@/lib/auth";
import { isAdmin, personName } from "@/lib/people";
import type { DB } from "@/lib/store";

/** The signed-in person, for server pages. "local" when running without login in development. */
export async function viewer(): Promise<{ id: string; admin: boolean }> {
  if (authMode() !== "on") return { id: "local", admin: true };
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value, process.env.BRIAN_SESSION_SECRET!);
  const id = s?.user ?? "anonymous";
  return { id, admin: isAdmin(id) };
}

/** Display names for everyone who appears in reactions, comments or activity. */
export function nameMap(db: Pick<DB, "people">, ids: Iterable<string>): Record<string, string> {
  return Object.fromEntries([...new Set(ids)].map((id) => [id, personName(db, id)]));
}

export function reactionIds(db: Pick<DB, "reactions">): string[] {
  return Object.values(db.reactions ?? {}).flatMap((r) => Object.values(r).flat());
}
