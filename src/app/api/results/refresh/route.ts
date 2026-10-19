import { refreshDue } from "@/lib/results/publications";
import { fail, requireUser, setActor } from "../../_util";

export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    return Response.json({ refreshed: await refreshDue() });
  } catch (e) {
    return fail(e);
  }
}
