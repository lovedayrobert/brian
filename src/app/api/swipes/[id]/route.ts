import { removeSwipe } from "@/lib/swipe";
import { fail, requireUser , setActor } from "../../_util";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    await removeSwipe((await params).id);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
