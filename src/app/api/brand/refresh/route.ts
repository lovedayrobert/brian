import { refreshLiveBrand } from "@/lib/brand/live-brand";
import { fail, requireUser, setActor } from "../../_util";

/** Re-read cashy.com and our channels for Cashy's voice (free). */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const live = await refreshLiveBrand();
    return Response.json({ ok: true, at: live.at });
  } catch (e) {
    return fail(e);
  }
}
