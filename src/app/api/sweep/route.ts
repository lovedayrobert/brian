import { runSweep } from "@/lib/pipeline/sweep";
import { fail } from "../_util";

export const maxDuration = 300;

export async function POST() {
  try {
    const run = await runSweep(() => {});
    return Response.json(run);
  } catch (e) {
    return fail(e, 500);
  }
}
