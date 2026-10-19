import { CalendarClient } from "@/components/calendar/calendar-client";
import type { DrawerState } from "@/components/calendar/task-drawer";
import { modelReady } from "@/lib/adapters/model";
import { rangeFor, todayDay, type View } from "@/lib/calendar/dates";
import { getCalendar } from "@/lib/calendar/service";
import { load } from "@/lib/queries";

export const metadata = { title: "Calendar" };

const VIEWS: View[] = ["month", "week", "agenda", "board"];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; d?: string; new?: string; ideaId?: string; open?: string }> }) {
  const sp = await searchParams;
  const view: View = VIEWS.includes(sp.view as View) ? (sp.view as View) : "month";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : todayDay();
  const { from, to } = rangeFor(view, anchor);
  const data = await getCalendar(from, to);

  // "Add to calendar" from an idea opens the new-task editor filled in.
  let prefill: DrawerState | undefined;
  if (sp.new && sp.ideaId) {
    const idea = (await load()).ideas.find((i) => i.id === sp.ideaId);
    if (idea)
      prefill = {
        mode: "create",
        preset: {
          date: sp.d ?? null,
          title: idea.name,
          ideaId: idea.id,
          kind: "stunt",
          description: [
            `**${idea.name}** (Brian idea)`,
            idea.shareMoment ? `What people say sharing it: "${idea.shareMoment}"` : "",
            idea.howItWorks ? `**How it's done:** ${idea.howItWorks}` : `**What happens:** ${idea.mechanism}`,
            idea.proof ? `**Proof that gets shared:** ${idea.proof}` : "",
            idea.effort ? `**Cost and time:** ${idea.effort}` : "",
            idea.backlash ? `**Backlash:** ${idea.backlash}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      };
  }

  return <CalendarClient initial={data} initialView={view} initialAnchor={anchor} ai={modelReady()} prefill={prefill} openDay={/^\d{4}-\d{2}-\d{2}$/.test(sp.open ?? "") ? sp.open : undefined} />;
}
