import { promises as fs } from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import type { Idea, Package } from "@/lib/domain/types";
import { mediaDir } from "@/lib/paths";
import { recordFeedback } from "@/lib/memory";
import type { ReviewSet } from "@/lib/review";
import { repo } from "@/lib/store";

/**
 * Moving a blind review between Brian installs. The reviewer runs their own
 * copy of Brian, so the frozen set (cards, packages, generated media) travels
 * as one gzipped file, and their verdicts come back as a small results file.
 *
 * Imported items are marked reviewOnly: they stay off Ideas, Today, Packages
 * and Mockups lists so the reviewer doesn't see scores before rating. The data
 * is still in the file, so on someone else's machine blindness is on trust.
 */
const MEDIA_DIR = mediaDir;

export interface ReviewBundle {
  format: "brian-review-v1";
  exportedAt: string;
  review: ReviewSet;
  ideas: Idea[];
  packages: Package[];
  media: Record<string, string>; // file name -> base64
}

export interface ReviewResults {
  format: "brian-review-results-v1";
  reviewId: string;
  exportedAt: string;
  ratings: ReviewSet["ratings"];
}

/** Every generated file a package's visuals point at. */
export function mediaNames(packages: Package[]): string[] {
  const names = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      const m = v.match(/^\/generated\/([\w.-]+)$/);
      if (m) names.add(m[1]);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  for (const p of packages) walk(p.sections.mockups.content);
  return [...names];
}

export async function exportReview(reviewId: string, outFile: string): Promise<{ file: string; bytes: number; media: number }> {
  const db = await repo.read();
  const review = db.reviews.find((r) => r.id === reviewId);
  if (!review) throw new Error(`No review ${reviewId}`);
  const ideaIds = new Set([...review.ideaIds, ...review.packageIds.map((pid) => db.packages.find((p) => p.id === pid)?.ideaId ?? "")]);
  const ideas = db.ideas.filter((i) => ideaIds.has(i.id));
  const packages = db.packages.filter((p) => review.packageIds.includes(p.id));
  const media: Record<string, string> = {};
  for (const name of mediaNames(packages)) {
    try {
      media[name] = (await fs.readFile(path.join(MEDIA_DIR(), name))).toString("base64");
    } catch {
      // a missing file just shows as pending on the other side
    }
  }
  const bundle: ReviewBundle = { format: "brian-review-v1", exportedAt: new Date().toISOString(), review: { ...review, ratings: {} }, ideas, packages, media };
  const gz = gzipSync(Buffer.from(JSON.stringify(bundle)));
  await fs.writeFile(outFile, gz);
  return { file: outFile, bytes: gz.length, media: Object.keys(media).length };
}

export function parseBundle(buf: Buffer): ReviewBundle {
  const json = JSON.parse(gunzipSync(buf).toString("utf8")) as ReviewBundle;
  if (json.format !== "brian-review-v1") throw new Error("Not a Brian review file");
  return json;
}

export async function importReview(file: string): Promise<ReviewSet> {
  return importReviewBuffer(await fs.readFile(file));
}

export async function importReviewBuffer(buf: Buffer): Promise<ReviewSet> {
  const bundle = parseBundle(buf);
  await fs.mkdir(MEDIA_DIR(), { recursive: true });
  for (const [name, b64] of Object.entries(bundle.media)) {
    if (!/^[\w.-]+$/.test(name)) continue; // never write outside the media folder
    await fs.writeFile(path.join(MEDIA_DIR(), name), Buffer.from(b64, "base64"));
  }
  await repo.update((d) => {
    const ids = new Set(bundle.ideas.map((i) => i.id));
    const pids = new Set(bundle.packages.map((p) => p.id));
    d.ideas = [...bundle.ideas.map((i) => ({ ...i, reviewOnly: true })), ...d.ideas.filter((i) => !ids.has(i.id))];
    d.packages = [...bundle.packages.map((p) => ({ ...p, reviewOnly: true })), ...d.packages.filter((p) => !pids.has(p.id))];
    d.reviews = [bundle.review, ...d.reviews.filter((r) => r.id !== bundle.review.id)];
  });
  return bundle.review;
}

export async function exportResults(reviewId: string, outFile: string): Promise<ReviewResults> {
  const review = (await repo.read()).reviews.find((r) => r.id === reviewId);
  if (!review) throw new Error(`No review ${reviewId}`);
  const results: ReviewResults = { format: "brian-review-results-v1", reviewId, exportedAt: new Date().toISOString(), ratings: review.ratings };
  await fs.writeFile(outFile, JSON.stringify(results, null, 2));
  return results;
}

/** Bring a reviewer's verdicts back: they're stored on the review and become feedback Brian learns from. */
export async function importRatings(file: string): Promise<{ added: number; skipped: number }> {
  const results = JSON.parse(await fs.readFile(file, "utf8")) as ReviewResults;
  if (results.format !== "brian-review-results-v1") throw new Error("Not a Brian review results file");
  const db = await repo.read();
  const review = db.reviews.find((r) => r.id === results.reviewId);
  if (!review) throw new Error(`This Brian doesn't have review ${results.reviewId}`);
  const fresh = Object.entries(results.ratings).filter(([id, r]) => review.ratings[id]?.at !== r.at);
  await repo.update((d) => {
    const rv = d.reviews.find((r) => r.id === results.reviewId)!;
    for (const [id, r] of fresh) rv.ratings[id] = r;
  });
  for (const [id, r] of fresh) {
    const pkg = db.packages.find((p) => p.id === id);
    const idea = db.ideas.find((i) => i.id === (pkg ? pkg.ideaId : id));
    await recordFeedback({
      target: { type: pkg ? "package" : "idea", id, label: idea?.name ?? id },
      sentiment: r.verdict === "run" ? "up" : "down",
      reason: r.note ? `(blind review by ${r.by}) ${r.note}` : undefined,
    });
  }
  return { added: fresh.length, skipped: Object.keys(results.ratings).length - fresh.length };
}
