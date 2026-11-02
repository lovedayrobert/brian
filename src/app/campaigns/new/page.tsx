import { NewCampaign } from "@/components/campaign/new-campaign";
import { addDays, todayDay } from "@/lib/calendar/dates";
import { specialDays } from "@/lib/calendar/days";

export const metadata = { title: "New campaign" };

/** Start a campaign: a name, a moment or dates, then straight into the brief. */
export default function NewCampaignPage() {
  const today = todayDay();
  const seen = new Set<string>();
  // The next time each moment comes round, soonest first.
  const upcoming = specialDays(today, addDays(today, 370))
    .filter((d) => d.kind !== "cashy" && !seen.has(d.title) && (seen.add(d.title), true))
    .map((d) => ({ title: d.title, date: d.date, why: d.why }));
  return <NewCampaign upcoming={upcoming} />;
}
