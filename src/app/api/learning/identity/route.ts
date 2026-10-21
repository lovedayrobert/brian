import { buildIdentity } from "@/lib/learning";
import { fail, requireUser, setActor } from "../../_util";

export const maxDuration = 180;

/** Rebuild Cashy's identity from every example and correction. About $0.10. */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    await buildIdentity();
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
