import type { SectionKey } from "@/lib/domain/types";
import { modelReady, ModelUnavailableError } from "@/lib/adapters/model";
import { steerPackage } from "@/lib/pipeline/develop";
import { fail, requireUser , setActor } from "../../../_util";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    if (!modelReady()) throw new ModelUnavailableError();
    const { id } = await params;
    const { instruction, from } = (await req.json()) as { instruction: string; from: SectionKey };
    if (!instruction?.trim()) throw new Error("Write an instruction first.");
    const affected = await steerPackage(id, instruction.trim(), from ?? "strategy");
    return Response.json({ id, affected });
  } catch (e) {
    return fail(e);
  }
}
