import * as z from "zod/v4";
import type { Signal } from "@/lib/domain/types";

/**
 * Brian Signal Format v1: how external feeds (X, Exa, Google Trends history,
 * Telegram, anything else) get into Brian. JSON Lines, one record per line,
 * or a JSON array. Spec for feed owners: docs/07-data-import.md.
 */
export const RecordSchema = z.object({
  source: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes"),
  id: z.string().min(1).max(200),
  url: z.url(),
  title: z.string().min(1).max(500),
  text: z.string().max(5000).optional(),
  author: z.string().max(200).optional(),
  published_at: z.iso.datetime({ offset: true }).optional(),
  metrics: z.record(z.string(), z.number().nonnegative()).optional(),
  primary_metric: z.string().optional(),
  series: z.array(z.object({ date: z.iso.date(), value: z.number().nonnegative() })).max(400).optional(),
  topics: z.array(z.string().max(60)).max(20).optional(),
  image_url: z.url().optional(),
  related: z.array(z.object({ title: z.string().max(500), url: z.url(), outlet: z.string().max(100).optional() })).max(20).optional(),
});

export type IngestRecord = z.infer<typeof RecordSchema>;

export interface ParseResult {
  records: IngestRecord[];
  errors: { line: number; message: string }[];
}

export const MAX_RECORDS = 5000;

export function parseIngest(body: string): ParseResult {
  const trimmed = body.trim();
  if (!trimmed) return { records: [], errors: [{ line: 0, message: "Empty body" }] };
  let raw: { line: number; value: unknown }[];
  if (trimmed.startsWith("[")) {
    try {
      raw = (JSON.parse(trimmed) as unknown[]).map((value, i) => ({ line: i + 1, value }));
    } catch (e) {
      return { records: [], errors: [{ line: 0, message: `Invalid JSON array: ${(e as Error).message}` }] };
    }
  } else {
    raw = trimmed
      .split("\n")
      .map((l, i) => ({ line: i + 1, text: l.trim() }))
      .filter((l) => l.text)
      .map((l) => {
        try {
          return { line: l.line, value: JSON.parse(l.text) as unknown };
        } catch {
          return { line: l.line, value: Symbol.for("bad-json") };
        }
      });
  }
  if (raw.length > MAX_RECORDS) return { records: [], errors: [{ line: 0, message: `Too many records (${raw.length}); send at most ${MAX_RECORDS} per request.` }] };

  const records: IngestRecord[] = [];
  const errors: ParseResult["errors"] = [];
  for (const r of raw) {
    if (r.value === Symbol.for("bad-json")) {
      errors.push({ line: r.line, message: "Not valid JSON" });
      continue;
    }
    const parsed = RecordSchema.safeParse(r.value);
    if (parsed.success) records.push(parsed.data);
    else errors.push({ line: r.line, message: parsed.error.issues.map((i) => `${i.path.join(".") || "record"}: ${i.message}`).join("; ") });
  }
  return { records, errors };
}

/** External records become ordinary signals; `ext:` keeps their source visible everywhere. */
export function toSignal(r: IngestRecord, now = new Date()): Signal {
  const metricKey = r.primary_metric && r.metrics?.[r.primary_metric] !== undefined ? r.primary_metric : Object.keys(r.metrics ?? {})[0];
  return {
    id: `ext:${r.source}:${r.id}`,
    sourceId: `ext:${r.source}`,
    url: r.url,
    title: r.title,
    summary: r.text?.slice(0, 600),
    author: r.author,
    imageUrl: r.image_url,
    metric: metricKey ? { label: metricKey, value: r.metrics![metricKey] } : undefined,
    series: r.series?.length ? [...r.series].sort((a, b) => a.date.localeCompare(b.date)) : undefined,
    related: r.related?.map((x) => ({ title: x.title, url: x.url, outlet: x.outlet ?? "" })),
    topics: r.topics ?? [],
    capturedAt: now.toISOString(),
    publishedAt: r.published_at,
  };
}

/** How long imported records stay in play; sweeps are about now. */
export const RETENTION_DAYS = 14;

export function mergeImported(existing: Signal[], incoming: Signal[], now = new Date()): Signal[] {
  const cutoff = now.getTime() - RETENTION_DAYS * 86_400_000;
  const byId = new Map(existing.filter((s) => new Date(s.publishedAt ?? s.capturedAt).getTime() >= cutoff).map((s) => [s.id, s]));
  for (const s of incoming) byId.set(s.id, s); // latest version of a record wins
  return [...byId.values()];
}
