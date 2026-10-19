import { editMemory } from "@/lib/memory";
import { fail, requireAdmin , setActor } from "../../_util";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { id } = await params;
    await editMemory(id, (await req.json()) as { text?: string; active?: boolean; forget?: boolean });
    return Response.json({ id });
  } catch (e) {
    return fail(e);
  }
}
