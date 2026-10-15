import { modelReady, ModelUnavailableError } from "@/lib/adapters/model";
import { consolidate } from "@/lib/memory";
import { fail } from "../../_util";

export const maxDuration = 120;

export async function POST() {
  try {
    if (!modelReady()) throw new ModelUnavailableError();
    const n = await consolidate();
    return Response.json({ lessons: n });
  } catch (e) {
    return fail(e);
  }
}
