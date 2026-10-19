import { importReviewBuffer } from "@/lib/review-transfer";
import { fail, requireAdmin , setActor } from "../../_util";

export const maxDuration = 300;

/** Load a blind-review bundle (gzipped) onto this server. Signed-in users only. */
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  setActor(req);
  try {
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length > 200_000_000) throw new Error("Bundle too large");
    const review = await importReviewBuffer(buf);
    return Response.json({ id: review.id, url: `/review/${review.id}` });
  } catch (e) {
    return fail(e);
  }
}
