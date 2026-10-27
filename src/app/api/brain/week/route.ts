import { weekContext } from "@/lib/week-context";
import { fail, requireUser, setActor } from "../../_util";

export const maxDuration = 120;

/** What else was happening between two dates. Mostly free; about $0.005 the first time, then cached. */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { from, to } = (await req.json()) as { from?: string; to?: string };
    return Response.json(await weekContext(from ?? "", to ?? ""));
  } catch (e) {
    return fail(e);
  }
}
