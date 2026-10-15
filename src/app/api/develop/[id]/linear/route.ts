import { pushToLinear } from "@/lib/adapters/tasks/linear";
import type { Handover } from "@/lib/pipeline/package-schemas";
import { repo } from "@/lib/store";
import { fail, requireUser } from "../../../_util";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(_req);
  if (denied) return denied;
  try {
    const { id } = await params;
    const pkg = (await repo.read()).packages.find((p) => p.id === id);
    const handover = pkg?.sections.handover.content as Handover | undefined;
    if (!pkg || !handover) throw new Error("The handover section is not ready yet.");
    const idea = (await repo.read()).ideas.find((i) => i.id === pkg.ideaId);
    if (!idea?.screening.redLines?.pass) throw new Error("This idea hasn't passed Red Lines, so it can't be handed over.");
    const result = await pushToLinear(handover, pkg.launchDate);
    return Response.json({ id, ...result });
  } catch (e) {
    return fail(e);
  }
}
