import { userFromRequest } from "@/lib/auth";
import { createCampaign } from "@/lib/campaigns";
import { fail, requireUser, setActor } from "../_util";

/** Start a campaign: a folder with its own mini Brian. Free. */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const b = (await req.json()) as { name?: string; moment?: string; from?: string; to?: string; brief?: string };
    const c = await createCampaign({ name: b.name ?? "", moment: b.moment, from: b.from, to: b.to, brief: b.brief, by: (await userFromRequest(req)) ?? "team" });
    return Response.json({ id: c.id });
  } catch (e) {
    return fail(e);
  }
}
