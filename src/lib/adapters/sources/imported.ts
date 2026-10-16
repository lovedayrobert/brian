import { promises as fs } from "node:fs";
import path from "node:path";
import { inboxDir } from "@/lib/paths";
import { mergeImported, parseIngest, toSignal } from "@/lib/ingest";
import { repo } from "@/lib/store";
import type { Signal } from "@/lib/domain/types";
import type { SourceAdapter } from "./types";

/**
 * External feeds in Brian Signal Format v1. Two ways in:
 *  - pushed to POST /api/ingest (stored as they arrive)
 *  - files dropped in data/inbox/*.jsonl (picked up on the next sweep, then moved to data/inbox/processed)
 */
const INBOX = inboxDir();

export const imported: SourceAdapter = {
  id: "imported",
  ready: () => true,
  async fetchSignals({ now, log }) {
    const files = await fs.readdir(INBOX).catch(() => [] as string[]);
    const fresh: Signal[] = [];
    for (const f of files.filter((x) => x.endsWith(".jsonl") || x.endsWith(".json"))) {
      const full = path.join(INBOX, f);
      const { records, errors } = parseIngest(await fs.readFile(full, "utf8"));
      if (errors.length) log(`${f}: ${errors.length} invalid line(s), first: line ${errors[0].line} ${errors[0].message}`);
      fresh.push(...records.map((r) => toSignal(r, now)));
      await fs.mkdir(path.join(INBOX, "processed"), { recursive: true });
      await fs.rename(full, path.join(INBOX, "processed", `${now.toISOString().replace(/[:.]/g, "-")}-${f}`));
    }
    const db = await repo.update((d) => {
      d.imported = mergeImported(d.imported ?? [], fresh, now);
    });
    return db.imported;
  },
};
