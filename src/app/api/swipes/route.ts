import { userFromRequest } from "@/lib/auth";
import { modelReady } from "@/lib/adapters/model";
import { breakDown } from "@/lib/learning";
import { addSwipe } from "@/lib/swipe";
import { fail, requireUser , setActor } from "../_util";

export const maxDuration = 120;

/** Add an example to Learning. Reading the link is free; Brian's explanation is one Opus call (about $0.03). */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { url, why, title, event, owner } = (await req.json()) as { url?: string; why?: string; title?: string; event?: string; owner?: "ours" | "competitor" | "other" };
    const s = await addSwipe({ url: url ?? "", why: why ?? "", title, event, owner: owner && ["ours", "competitor", "other"].includes(owner) ? owner : undefined, by: (await userFromRequest(req)) ?? "team" });
    // Saved either way; if the explanation fails (cap, outage) it can be asked for again on the card.
    let explained = false;
    if (modelReady()) explained = await breakDown(s.id).then(() => true, () => false);
    return Response.json({ id: s.id, explained });
  } catch (e) {
    return fail(e);
  }
}
