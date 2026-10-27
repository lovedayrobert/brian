import { updateCampaign } from "@/lib/campaigns";
import { fail, requireUser, setActor } from "../../_util";

/** Change a campaign's brief or dates. Free. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const b = (await req.json()) as { brief?: string; from?: string; to?: string };
    await updateCampaign((await params).id, b);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
