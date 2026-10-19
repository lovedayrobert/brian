import { specialDayById } from "@/lib/calendar/days";
import { ideasForDay } from "@/lib/pipeline/rapid";
import { fail, requireUser } from "../../_util";

export const maxDuration = 300;

/** Three post ideas for a special day (one call, roughly $0.05-0.15). */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    const { dayId, steer } = (await req.json()) as { dayId?: string; steer?: string };
    const day = dayId ? specialDayById(dayId) : undefined;
    if (!day) throw new Error("That day isn't in the calendar.");
    const rr = await ideasForDay(day, "cashy", steer?.slice(0, 500));
    return Response.json({ id: rr.id, takes: rr.takes });
  } catch (e) {
    return fail(e);
  }
}
