import { promises as fs } from "node:fs";
import path from "node:path";
import { dataDir } from "@/lib/paths";
import type { AgentRun, Idea, Moment, Package, Signal, SweepRun, Trend } from "@/lib/domain/types";
import type { RapidResponse } from "@/lib/pipeline/rapid";
import type { BacktestResult } from "@/lib/engine/backtest";
import type { Feedback, Memory, MemoryEvent } from "@/lib/memory";
import type { ReviewSet } from "@/lib/review";

/**
 * Repository interface. The prototype uses a local JSON file so it runs with
 * zero setup; `supabase/migrations/0001_init.sql` holds the Postgres schema
 * for the hosted build. Swapping means implementing this interface once.
 */
export interface Repository {
  read(): Promise<DB>;
  update(fn: (db: DB) => void | Promise<void>): Promise<DB>;
}

export interface DB {
  signals: Signal[];
  trends: Trend[];
  moments: Moment[];
  ideas: Idea[];
  packages: Package[];
  agentRuns: AgentRun[];
  sweeps: SweepRun[];
  rapid: RapidResponse[];
  backtest?: BacktestResult;
  memories: Memory[];
  memoryEvents: MemoryEvent[];
  feedback: Feedback[];
  /** USD spent per UTC day. Never trimmed; drives the hard spend cap. */
  spendLedger: Record<string, number>;
  /** Records from external feeds (Brian Signal Format v1), kept for 14 days */
  imported: Signal[];
  reviews: ReviewSet[];
}

const EMPTY: DB = { signals: [], trends: [], moments: [], ideas: [], packages: [], agentRuns: [], sweeps: [], rapid: [], memories: [], memoryEvents: [], feedback: [], spendLedger: {}, imported: [], reviews: [] };

const LOCK_STALE_MS = 30_000;
const LOCK_WAIT_MS = 20_000;

class FileRepository implements Repository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private file: string) {}

  async read(): Promise<DB> {
    try {
      const raw = await fs.readFile(this.file, "utf8");
      return { ...EMPTY, ...JSON.parse(raw) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY);
      throw e;
    }
  }

  /**
   * Read-modify-write under a lock file, so the app and scripts (separate
   * processes) can't overwrite each other's changes. Within a process, writes
   * are also queued. The rename is atomic, so readers never see a partial file.
   */
  update(fn: (db: DB) => void | Promise<void>): Promise<DB> {
    const run = this.queue.then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const release = await this.lock();
      try {
        const db = await this.read();
        await fn(db);
        const tmp = `${this.file}.${process.pid}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(db));
        await fs.rename(tmp, this.file);
        return db;
      } finally {
        await release();
      }
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Exclusive lock across processes. Locks older than 30s are treated as left by a crashed process. */
  private async lock(): Promise<() => Promise<void>> {
    const lockPath = `${this.file}.lock`;
    const started = Date.now();
    for (;;) {
      try {
        const handle = await fs.open(lockPath, "wx");
        await handle.writeFile(String(process.pid));
        await handle.close();
        return async () => {
          await fs.rm(lockPath, { force: true });
        };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        const stat = await fs.stat(lockPath).catch(() => null);
        if (stat && Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          await fs.rm(lockPath, { force: true });
          continue;
        }
        if (Date.now() - started > LOCK_WAIT_MS) throw new Error("Brian's data file is busy; try again in a moment.");
        await new Promise((r) => setTimeout(r, 20 + Math.random() * 30));
      }
    }
  }
}

const globalForRepo = globalThis as unknown as { brianRepo?: Repository };

export const repo: Repository =
  globalForRepo.brianRepo ??
  (globalForRepo.brianRepo = new FileRepository(path.join(dataDir(), "brian.json")));

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
