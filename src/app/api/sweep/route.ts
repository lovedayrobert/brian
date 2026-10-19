import { startSweep, sweepStatus } from "@/lib/sweep-job";
import { requireUser , setActor } from "../_util";

/** Start a sweep in the background; returns straight away. */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  return Response.json(startSweep(), { status: 202 });
}

/** Whether a sweep is running, so any page can pick up its progress. */
export async function GET(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  return Response.json(sweepStatus());
}
