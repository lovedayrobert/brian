import { currentActor } from "@/lib/actor";
import { repo } from "@/lib/store";
import { fail, requireUser, setActor } from "../_util";

/** Per-person settings (calendar filters and display) so they follow you across devices. */
export async function PUT(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const body = (await req.json()) as { calendarFilters?: unknown; calendarDisplay?: unknown };
    if (JSON.stringify(body).length > 20_000) throw new Error("Too large");
    const me = currentActor() ?? "local";
    await repo.update((d) => {
      d.prefs ??= {};
      d.prefs[me] = { ...(d.prefs[me] ?? {}), ...(body.calendarFilters !== undefined ? { calendarFilters: body.calendarFilters } : {}), ...(body.calendarDisplay !== undefined ? { calendarDisplay: body.calendarDisplay } : {}) };
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
