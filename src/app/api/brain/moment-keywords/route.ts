import { repo } from "@/lib/store";
import { fail, requireUser, setActor } from "../../_util";

/**
 * The team improves a moment's keywords: words they add are kept for next time,
 * words they remove stay removed. Shared by everyone. Free.
 */
export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { moment, add, remove } = (await req.json()) as { moment?: string; add?: string[]; remove?: string[] };
    if (!moment?.trim()) throw new Error("Which moment?");
    const clean = (xs?: string[]) => (xs ?? []).map((x) => String(x).trim().toLowerCase()).filter((x) => x && x.length <= 40).slice(0, 20);
    const adds = clean(add);
    const removes = clean(remove);
    let saved = { added: [] as string[], removed: [] as string[] };
    await repo.update((d) => {
      const all = (d.momentKeywords ??= {});
      const m = (all[moment] ??= { added: [], removed: [] });
      for (const w of adds) {
        m.removed = m.removed.filter((x) => x !== w);
        if (!m.added.includes(w)) m.added.push(w);
      }
      for (const w of removes) {
        if (m.added.includes(w)) m.added = m.added.filter((x) => x !== w);
        else if (!m.removed.includes(w)) m.removed.push(w);
      }
      saved = { added: [...m.added], removed: [...m.removed] };
    });
    return Response.json(saved);
  } catch (e) {
    return fail(e);
  }
}
