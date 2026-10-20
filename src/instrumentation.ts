/**
 * Runs once when the server starts. Every 30 minutes: picks up new posts on
 * our own channels and their follower counts, and re-reads published posts
 * so each gets its 1-hour, 24-hour and 7-day numbers without anyone pressing
 * anything. Only on the Node server, never in the build.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { refreshDue } = await import("@/lib/results/publications");
  const { snapshotChannels } = await import("@/lib/results/channels");
  const tick = () =>
    snapshotChannels()
      .then(() => refreshDue())
      .catch((e) => console.error("Results refresh failed:", (e as Error).message));
  setTimeout(tick, 60_000);
  setInterval(tick, 30 * 60_000);

  // Brian on his own (BRIAN_AUTO=1): reads every few hours, a morning Pulse, ideas on hot days. See src/lib/autopilot.ts.
  const auto = await import("@/lib/autopilot");
  if (auto.autoEnabled()) {
    setTimeout(() => auto.tick(), 120_000);
    setInterval(() => auto.tick(), 10 * 60_000);
  }
}
