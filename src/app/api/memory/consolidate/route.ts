import { modelReady, ModelUnavailableError } from "@/lib/adapters/model";
import { consolidate } from "@/lib/memory";
import { fail, requireUser } from "../../_util";

export const maxDuration = 120;

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    if (!modelReady()) throw new ModelUnavailableError();
    const n = await consolidate();
    return Response.json({ lessons: n });
  } catch (e) {
    return fail(e);
  }
}
