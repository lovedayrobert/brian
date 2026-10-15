import { reactToMoment } from "@/lib/pipeline/rapid";
import { fail, requireUser } from "../_util";

export const maxDuration = 120;

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    const { momentId } = (await req.json()) as { momentId: string };
    const rr = await reactToMoment(momentId, "cashy");
    return Response.json({ id: rr.id });
  } catch (e) {
    return fail(e);
  }
}
