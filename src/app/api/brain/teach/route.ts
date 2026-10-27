import { userFromRequest } from "@/lib/auth";
import { digest } from "@/lib/brain";
import { addSwipe } from "@/lib/swipe";
import { fail, requireUser, setActor } from "../../_util";

export const maxDuration = 180;

/** Teach Brian: save the link (free), then digest it into his brain (one Opus call, about $0.04). */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { url, why, event, context } = (await req.json()) as { url?: string; why?: string; event?: string; context?: string };
    const s = await addSwipe({ url: url ?? "", why: why ?? "", event, context, by: (await userFromRequest(req)) ?? "team" });
    const d = await digest(s.id);
    return Response.json({ swipeId: s.id, digest: d });
  } catch (e) {
    return fail(e);
  }
}
