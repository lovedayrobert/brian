import { getCalendar } from "@/lib/calendar/service";
import { fail, requireUser , setActor } from "../_util";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Everything the calendar shows between two dates. */
export async function GET(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const u = new URL(req.url);
    const from = u.searchParams.get("from") ?? "";
    const to = u.searchParams.get("to") ?? "";
    if (!DAY.test(from) || !DAY.test(to) || from > to) throw new Error("from and to must be YYYY-MM-DD");
    if (new Date(to).getTime() - new Date(from).getTime() > 400 * 86_400_000) throw new Error("Range too long");
    return Response.json(await getCalendar(from, to));
  } catch (e) {
    return fail(e);
  }
}
