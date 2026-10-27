import { userFromRequest } from "@/lib/auth";
import { cleanHandle, lookBack } from "@/lib/lookback";
import { findLook, lookKey, saveLook } from "@/lib/research";
import { fail, requireUser, setActor } from "../../_util";

export const maxDuration = 180;

/**
 * A brand's posts around a moment. Free routes always; paid ones only when allowPaid (cost shown first).
 * Every look is saved; the same look again is reused for free unless `fresh` asks for a new read.
 */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const b = (await req.json()) as { handle?: string; from?: string; to?: string; allowPaid?: boolean; keywords?: string[]; moment?: string; label?: string; campaignId?: string; fresh?: boolean };
    const keywords = Array.isArray(b.keywords) ? b.keywords.map(String) : [];
    const paid = b.allowPaid === true;
    const key = lookKey({ handle: cleanHandle(b.handle ?? ""), from: b.from ?? "", to: b.to ?? "", keywords, paid });
    if (!b.fresh) {
      const earlier = await findLook(key);
      if (earlier) return Response.json({ ...earlier, costUsd: 0, reused: true });
    }
    const r = await lookBack({ handle: b.handle ?? "", from: b.from ?? "", to: b.to ?? "", allowPaid: paid, keywords, moment: typeof b.moment === "string" ? b.moment.slice(0, 80) : undefined });
    const saved = await saveLook(r, { by: (await userFromRequest(req)) ?? "team", label: b.label?.slice(0, 80), campaignId: b.campaignId, keywords, paid });
    return Response.json(saved);
  } catch (e) {
    return fail(e);
  }
}
