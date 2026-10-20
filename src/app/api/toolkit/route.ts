import { repo } from "@/lib/store";
import { fail, requireAdmin, setActor } from "../_util";

/** Admins set what the brand can actually do; every idea run reads it. */
export async function PUT(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { brandId, text } = (await req.json()) as { brandId?: string; text?: string };
    if (!brandId || typeof text !== "string" || text.length > 6000) throw new Error("Send a brand and up to 6,000 characters.");
    await repo.update((d) => {
      d.toolkit = { ...(d.toolkit ?? {}), [brandId]: text };
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
