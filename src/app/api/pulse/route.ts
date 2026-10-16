import { readPulse } from "@/lib/pipeline/pulse";
import { fail, requireUser } from "../_util";

export const maxDuration = 300;

/** Read the room from the latest sweep (one Sonnet call). */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    const p = await readPulse();
    return Response.json({ id: p.id });
  } catch (e) {
    return fail(e);
  }
}
