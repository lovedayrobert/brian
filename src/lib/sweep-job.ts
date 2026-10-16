import { runSweep } from "@/lib/pipeline/sweep";

/**
 * A sweep runs on the server, not inside the browser request, so leaving the
 * page doesn't hide or lose it. One at a time; pressing Refresh again while
 * one runs just shows that one.
 */
interface Job {
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

const g = globalThis as unknown as { brianSweepJob?: Job & { running: boolean } };

export function sweepStatus(): { running: boolean; startedAt?: string; finishedAt?: string; error?: string } {
  const j = g.brianSweepJob;
  return j ? { running: j.running, startedAt: j.startedAt, finishedAt: j.finishedAt, error: j.error } : { running: false };
}

export function startSweep() {
  if (g.brianSweepJob?.running) return sweepStatus();
  const job = (g.brianSweepJob = { running: true, startedAt: new Date().toISOString() } as Job & { running: boolean });
  runSweep(() => {})
    .catch((e) => {
      job.error = (e as Error).message;
    })
    .finally(() => {
      job.running = false;
      job.finishedAt = new Date().toISOString();
    });
  return sweepStatus();
}
