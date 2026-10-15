// The blind test agreed with Marko: 20 idea cards and 2 packages from FREE sources only,
// rated blind. Pass mark: 3 of 20 cards he would actually run.
//
// Fairness rules, enforced here:
//  - free sources only: partner imports (ext:*) are excluded from the sweep for this run
//  - every card Brian produces goes in, in the order produced, until there are 20; nothing is removed
//  - the 2 packages are Brian's own top 2 cards by its Critic score, not picked by a person
//  - the display order is shuffled once and frozen
//
// Usage: npm run eval   (needs ANTHROPIC_API_KEY; takes 30–60 minutes; ~$25–40 within the spend cap)
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd()); // read .env.local like the app does
import { modelReady, spendStatus } from "@/lib/adapters/model";
import type { Idea } from "@/lib/domain/types";
import { LENSES } from "@/lib/brand/lenses";
import { generateIdeas, totalScore } from "@/lib/pipeline/ideas";
import { runPackage, startPackage } from "@/lib/pipeline/develop";
import { runSweep } from "@/lib/pipeline/sweep";
import { launchWindow, breaking } from "@/lib/queries";
import { createReviewSet } from "@/lib/review";
import { repo } from "@/lib/store";

const TARGET = 20;
if (!modelReady()) {
  console.error("ANTHROPIC_API_KEY is not set. Add it to .env.local first.");
  process.exit(1);
}

console.log("1/4 Fresh sweep (free sources only)…");
process.env.BRIAN_FREE_SOURCES_ONLY = "1"; // partner feeds are excluded from this test by agreement
await runSweep((m) => (m.includes("failed") ? console.log(m) : undefined));

const db = await repo.read();
const trends = launchWindow(db.trends, 8);
const moments = breaking(db.moments).filter((m) => !m.industry && m.sensitivity !== "blocked").slice(0, 8);
// Alternate trend, moment and Lab lens so the set reflects everything Brian does.
const queue: ({ trendId: string } | { momentId: string } | { lens: string })[] = [];
for (let i = 0; i < 8; i++) {
  if (trends[i]) queue.push({ trendId: trends[i].id });
  if (moments[i]) queue.push({ momentId: moments[i].id });
  if (LENSES[i]) queue.push({ lens: LENSES[i].id });
}

console.log(`2/4 Generating until ${TARGET} cards (${queue.length} subjects queued)…`);
const cards: Idea[] = [];
for (const subject of queue) {
  if (cards.length >= TARGET) break;
  try {
    const r = await generateIdeas({ brandId: "cashy", ...subject });
    cards.push(...r.cards);
    console.log(`   ${JSON.stringify(subject)} → ${r.cards.length} card(s), ${r.killed.length} killed. Total ${cards.length}`);
  } catch (e) {
    console.log(`   ${JSON.stringify(subject)} → skipped: ${(e as Error).message}`);
    if ((e as Error).constructor.name === "SpendCapError") break;
  }
}
const set = cards.slice(0, TARGET);
if (set.length < TARGET) console.log(`   Only ${set.length} cards were produced; the review will use all of them.`);

console.log("3/4 Developing Brian's own top 2 cards…");
const top2 = [...set].sort((a, b) => totalScore(b) - totalScore(a)).slice(0, 2);
const packageIds: string[] = [];
for (const idea of top2) {
  try {
    const pkg = await startPackage(idea.id);
    await runPackage(pkg.id);
    packageIds.push(pkg.id);
    console.log(`   Package ready: ${idea.name}`);
  } catch (e) {
    console.log(`   Package for ${idea.name} failed: ${(e as Error).message}`);
  }
}

console.log("4/4 Freezing the blind review…");
const review = await createReviewSet({
  title: "Blind test: 20 cards, 2 packages, free sources",
  protocol:
    "Free sources only. Every card Brian produced, in order, until 20; none removed. Packages are Brian's top 2 by its own Critic score. Order shuffled once. Pass mark agreed in advance: 3 of 20 cards the reviewer would actually run.",
  ideas: set,
  packageIds,
  passMark: 3,
});
const spend = await spendStatus();
console.log(`\nDone. Review: /review/${review.id}`);
console.log(`AI spend today: $${spend.spentToday.toFixed(2)} (cap $${spend.caps.dailyUsd})`);
