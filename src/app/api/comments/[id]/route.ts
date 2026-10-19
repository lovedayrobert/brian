import { userFromRequest } from "@/lib/auth";
import { deleteComment } from "@/lib/collab";
import { isAdmin } from "@/lib/people";
import { fail, requireUser, setActor } from "../../_util";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    await deleteComment((await params).id, isAdmin(await userFromRequest(req)));
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
