import { deleteTask, type TaskInput, updateTask } from "@/lib/calendar/service";
import { fail, requireUser } from "../../../_util";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    return Response.json({ task: await updateTask((await params).id, (await req.json()) as TaskInput) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    await deleteTask((await params).id);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
