import { promises as fs } from "node:fs";
import path from "node:path";
import { dataDir } from "@/lib/paths";
import type { AgentRun, CalendarItem, Idea, Moment, Package, Pulse, Signal, Swipe, SweepRun, Trend } from "@/lib/domain/types";
import type { RapidResponse } from "@/lib/pipeline/rapid";
import type { BacktestResult } from "@/lib/engine/backtest";
import type { Feedback, Memory, MemoryEvent } from "@/lib/memory";
import type { ReviewSet } from "@/lib/review";
import type { Person } from "@/lib/people";
import type { Activity } from "@/lib/activity";
import type { Comment } from "@/lib/collab-types";
import type { Publication } from "@/lib/results/publications";
import type { ChannelSnapshot } from "@/lib/results/channels";
import type { XState } from "@/lib/adapters/sources/x";

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
  /** Latest Pulse readings, newest first */
  pulses: Pulse[];
  /** The team swipe file */
  swipes: Swipe[];
  /** The marketing calendar: team items, CRM sheet rows and Linear issues */
  calendar: CalendarItem[];
  /** Brian-only fields for Linear issues (channel, idea link), keyed by issue id */
  calendarMeta: Record<string, { channel?: CalendarItem["channel"]; kind?: CalendarItem["type"]; ideaId?: string; specialDayId?: string; createdBy?: string }>;
  /** Last read of the CRM sheet */
  crmSync: { at: string; ok: boolean; rows: number; skipped: number; error?: string } | null;
  /** Everyone who has signed in */
  people: Person[];
  /** What the team did, newest first */
  activity: Activity[];
  /** target id → emoji → person ids */
  reactions: Record<string, Record<string, string[]>>;
  comments: Comment[];
  /** Per-person settings that follow them across devices */
  prefs: Record<string, { calendarFilters?: unknown; calendarDisplay?: unknown }>;
  /** Published posts for calendar tasks, with their numbers over time */
  publications: Publication[];
  /** Follower counts for our own channels over time */
  channelStats: ChannelSnapshot[];
  /** X API post reads this month, so the bill stays under the limit */
  xUsage?: { month: string; reads: number; lastPull?: string; userId?: string };
  /** X API discovery: spend this month and today, and the posts from the last pulls */
  xState?: XState;
}

const EMPTY: DB = { signals: [], trends: [], moments: [], ideas: [], packages: [], agentRuns: [], sweeps: [], rapid: [], memories: [], memoryEvents: [], feedback: [], spendLedger: {}, imported: [], reviews: [], pulses: [], swipes: [], calendar: [], calendarMeta: {}, crmSync: null, people: [], activity: [], reactions: {}, comments: [], prefs: {}, publications: [], channelStats: [] };

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
