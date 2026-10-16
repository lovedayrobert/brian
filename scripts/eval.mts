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
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd()); // read .env.local like the app does
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
// Three subjects at a time for speed; cards are always collected in queue order, so
// "every card, in the order produced" holds regardless of which run finishes first.
const cards: Idea[] = [];
let capHit = false;
for (let i = 0; i < queue.length && cards.length < TARGET && !capHit; i += 3) {
  const batch = queue.slice(i, i + 3);
  const results = await Promise.allSettled(batch.map((subject) => generateIdeas({ brandId: "cashy", ...subject })));
  results.forEach((r, j) => {
    if (r.status === "fulfilled") {
      cards.push(...r.value.cards);
      console.log(`   ${JSON.stringify(batch[j])} → ${r.value.cards.length} card(s), ${r.value.killed.length} killed. Total ${cards.length}`);
    } else {
      console.log(`   ${JSON.stringify(batch[j])} → skipped: ${(r.reason as Error).message}`);
      if ((r.reason as Error).constructor.name === "SpendCapError") capHit = true;
    }
  });
}
const set = cards.slice(0, TARGET);
if (set.length < TARGET) console.log(`   Only ${set.length} cards were produced; the review will use all of them.`);

console.log("3/4 Developing Brian's own top 2 cards…");
const top2 = [...set].sort((a, b) => totalScore(b) - totalScore(a)).slice(0, 2);
const packageIds: string[] = [];
const packageIdea = new Map<string, string>();
await Promise.all(
  top2.map(async (idea) => {
    try {
      const pkg = await startPackage(idea.id);
      await runPackage(pkg.id);
      packageIds.push(pkg.id);
      packageIdea.set(pkg.id, idea.id);
      console.log(`   Package ready: ${idea.name}`);
    } catch (e) {
      console.log(`   Package for ${idea.name} failed: ${(e as Error).message}`);
    }
  }),
);
// Keep the packages in Brian's ranking order, not finish order.
packageIds.sort((a, b) => top2.findIndex((i) => i.id === packageIdea.get(a)) - top2.findIndex((i) => i.id === packageIdea.get(b)));

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
