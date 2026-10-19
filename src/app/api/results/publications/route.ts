import { addPublication } from "@/lib/results/publications";
import { repo } from "@/lib/store";
import { fail, requireUser, setActor } from "../../_util";

export async function GET(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  const taskId = new URL(req.url).searchParams.get("taskId");
  const pubs = ((await repo.read()).publications ?? []).filter((p) => !taskId || p.taskId === taskId);
  return Response.json({ publications: pubs });
}

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const b = (await req.json()) as { taskId?: string; taskTitle?: string; taskDate?: string | null; ideaId?: string; url?: string };
    if (!b.taskId || !b.taskTitle || !b.url) throw new Error("Paste the link to the post.");
    return Response.json({ publication: await addPublication({ taskId: b.taskId, taskTitle: b.taskTitle, taskDate: b.taskDate ?? null, ideaId: b.ideaId, url: b.url }) });
  } catch (e) {
    return fail(e);
  }
}
