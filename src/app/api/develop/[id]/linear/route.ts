import { pushToLinear } from "@/lib/adapters/tasks/linear";
import type { Handover } from "@/lib/pipeline/package-schemas";
import { repo } from "@/lib/store";
import { fail } from "../../../_util";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pkg = (await repo.read()).packages.find((p) => p.id === id);
    const handover = pkg?.sections.handover.content as Handover | undefined;
    if (!pkg || !handover) throw new Error("The handover section is not ready yet.");
    const result = await pushToLinear(handover, pkg.launchDate);
    return Response.json({ id, ...result });
  } catch (e) {
    return fail(e);
  }
}
