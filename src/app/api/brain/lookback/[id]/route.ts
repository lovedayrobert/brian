import { repo } from "@/lib/store";
import { fail, requireUser, setActor } from "../../../_util";

/** Reopen a saved look. Free. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const id = (await params).id;
    const l = (await repo.read()).looks?.find((x) => x.id === id);
    if (!l) throw new Error("That research is gone.");
    return Response.json({ ...l, costUsd: 0, reused: true });
  } catch (e) {
    return fail(e);
  }
}
