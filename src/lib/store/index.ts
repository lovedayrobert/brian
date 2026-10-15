import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentRun, Idea, Moment, Package, Signal, SweepRun, Trend } from "@/lib/domain/types";
import type { RapidResponse } from "@/lib/pipeline/rapid";
import type { BacktestResult } from "@/lib/engine/backtest";
import type { Feedback, Memory, MemoryEvent } from "@/lib/memory";

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
}

const EMPTY: DB = { signals: [], trends: [], moments: [], ideas: [], packages: [], agentRuns: [], sweeps: [], rapid: [], memories: [], memoryEvents: [], feedback: [] };

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

  /** Serialised read-modify-write with an atomic rename, so concurrent jobs never corrupt the file. */
  update(fn: (db: DB) => void | Promise<void>): Promise<DB> {
    const run = this.queue.then(async () => {
      const db = await this.read();
      await fn(db);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db));
      await fs.rename(tmp, this.file);
      return db;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}

const globalForRepo = globalThis as unknown as { brianRepo?: Repository };

export const repo: Repository =
  globalForRepo.brianRepo ??
  (globalForRepo.brianRepo = new FileRepository(path.join(process.cwd(), ".data", "brian.json")));

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
