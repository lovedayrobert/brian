import type { PulseItem } from "@/lib/domain/types";
import { repo } from "@/lib/store";

/**
 * Brian working on his own (Rob, 20 Oct: "proactively seek out ideas rather
 * than me have to go in and force it"). Switched on with BRIAN_AUTO=1:
 *
 * - every BRIAN_AUTO_SWEEP_HOURS (3): a sweep. Free sources, plus X reads inside their own monthly budget.
 * - each morning from BRIAN_AUTO_HOUR (7, UTC): one Pulse (Sonnet).
 * - then, only if the Pulse found something hot (feeling 8/10 or more, with an opening): one idea run,
 *   Opus alone (about $0.70), whatever BRIAN_QUALITY says. Fable and Astra stay for runs people start.
 *   Nothing hot means no run, and zero ideas from a run is a fine result.
 *
 * At most one Pulse and one idea run a day, and the spend caps still apply to every call.
 */
export const HOT = 8;

/** Automatic idea runs. Paused since 21 Oct (set BRIAN_AUTO_IDEAS=1 to resume) while the team teaches Brian; reads and the Pulse carry on. */
export function autoIdeas(): boolean {
  return process.env.BRIAN_AUTO_IDEAS === "1";
}

export function autoEnabled(): boolean {
  return process.env.BRIAN_AUTO === "1";
}

const sweepHours = () => Number(process.env.BRIAN_AUTO_SWEEP_HOURS) || 3;
const morningHour = () => Number(process.env.BRIAN_AUTO_HOUR ?? 7);
const day = (d: Date) => d.toISOString().slice(0, 10);

/** The Pulse items worth an automatic idea run: strong feeling, and a brand can go there. */
export function hotItems(items: PulseItem[]): PulseItem[] {
  return items.filter((i) => i.intensity >= HOT && !!i.opening);
}

/** What should happen on this tick. Pure, so it's tested. */
export function plan(state: { lastSweep?: string; pulseDay?: string; ideasDay?: string }, now: Date, sweepRunning: boolean): { sweep: boolean; pulse: boolean; ideas: boolean } {
  const today = day(now);
  const sinceSweep = state.lastSweep ? now.getTime() - new Date(state.lastSweep).getTime() : Infinity;
  const morning = now.getUTCHours() >= morningHour();
  // The morning Pulse waits for a sweep from this morning, so it reads fresh posts.
  const freshSweep = !!state.lastSweep && day(new Date(state.lastSweep)) === today && new Date(state.lastSweep).getUTCHours() >= morningHour() - 1;
  const sweep = !sweepRunning && (sinceSweep >= sweepHours() * 3_600_000 || (morning && state.pulseDay !== today && !freshSweep));
  const pulse = !sweepRunning && morning && freshSweep && state.pulseDay !== today;
  const ideas = !sweepRunning && morning && state.pulseDay === today && state.ideasDay !== today;
  return { sweep, pulse, ideas };
}

let busy = false;

async function setState(patch: Partial<NonNullable<Awaited<ReturnType<typeof repo.read>>["autopilot"]>>) {
  await repo.update((d) => {
    d.autopilot = { ...(d.autopilot ?? {}), ...patch };
  });
}

export async function tick(now = new Date()): Promise<void> {
  if (!autoEnabled() || busy) return;
  busy = true;
  try {
    const { runAs } = await import("@/lib/actor");
    await runAs("brian", async () => {
      const { startSweep, sweepStatus } = await import("@/lib/sweep-job");
      const db = await repo.read();
      const state = db.autopilot ?? {};
      const todo = plan(state, now, sweepStatus().running);
      if (todo.sweep) {
        await setState({ lastSweep: now.toISOString() });
        startSweep(); // in the background, same job as the Refresh button, so the two never run at once
        return; // the Pulse picks up on a later tick, once the sweep has finished
      }
      if (todo.pulse) {
        await setState({ pulseDay: day(now) });
        const { readPulse } = await import("@/lib/pipeline/pulse");
        await readPulse();
        return;
      }
      if (todo.ideas && autoIdeas()) {
        await setState({ ideasDay: day(now) });
        const pulse = db.pulses?.[0];
        const hot = hotItems(pulse?.items ?? []);
        if (!hot.length) {
          await setState({ last: { at: now.toISOString(), ran: false, note: "Nothing hot enough in the room today, so no ideas run." } });
          return;
        }
        const { generateIdeas } = await import("@/lib/pipeline/ideas");
        const { withStandardQuality } = await import("@/lib/adapters/model");
        const r = await withStandardQuality(() => generateIdeas({ brandId: "cashy", lens: "blank-page" }));
        await setState({
          last: {
            at: now.toISOString(),
            ran: true,
            cards: r.cards.length,
            ideaIds: r.cards.map((c) => c.id),
            note: r.cards.length
              ? `${hot.map((h) => h.subject).slice(0, 3).join(", ")} ${hot.length === 1 ? "was" : "were"} hot, and ${r.cards.length} idea${r.cards.length === 1 ? "" : "s"} got through.`
              : `${hot.map((h) => h.subject).slice(0, 3).join(", ")} ${hot.length === 1 ? "was" : "were"} hot, but nothing good enough got through. No ideas beats bad ideas.`,
          },
        });
      }
    });
  } catch (e) {
    console.error("Autopilot:", (e as Error).message);
    await setState({ last: { at: now.toISOString(), ran: false, note: `Stopped: ${(e as Error).message}` } }).catch(() => {});
  } finally {
    busy = false;
  }
}
