import { runSweep } from "@/lib/pipeline/sweep";
import { fail, requireUser } from "../_util";

export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    const run = await runSweep(() => {});
    return Response.json(run);
  } catch (e) {
    return fail(e, 500);
  }
}
