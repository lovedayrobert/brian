/**
 * Runs once when the server starts. Re-reads published posts every 30 minutes
 * so each gets its 1-hour, 24-hour and 7-day numbers without anyone pressing
 * anything. Only on the Node server, never in the build.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { refreshDue } = await import("@/lib/results/publications");
  const tick = () => refreshDue().catch((e) => console.error("Results refresh failed:", (e as Error).message));
  setTimeout(tick, 60_000);
  setInterval(tick, 30 * 60_000);
}
