import { lookBack } from "@/lib/lookback";
import { fail, requireUser, setActor } from "../../_util";

export const maxDuration = 180;

/** A brand's posts around a moment. Free routes always; paid ones only when allowPaid (cost shown first). */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { handle, from, to, allowPaid, keywords } = (await req.json()) as { handle?: string; from?: string; to?: string; allowPaid?: boolean; keywords?: string[] };
    return Response.json(await lookBack({ handle: handle ?? "", from: from ?? "", to: to ?? "", allowPaid: allowPaid === true, keywords: Array.isArray(keywords) ? keywords.map(String) : undefined }));
  } catch (e) {
    return fail(e);
  }
}
