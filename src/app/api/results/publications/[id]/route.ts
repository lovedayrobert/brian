import { addManualStats, removePublication } from "@/lib/results/publications";
import type { Stats } from "@/lib/results/platforms";
import { fail, requireUser, setActor } from "../../../_util";

/** Numbers entered by hand, for platforms Brian can't read yet. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { stats } = (await req.json()) as { stats?: Stats };
    return Response.json({ publication: await addManualStats((await params).id, stats ?? {}) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    await removePublication((await params).id);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
