import { getJson, sleep } from "@/lib/adapters/sources/types";
import { backtest } from "@/lib/engine/backtest";
import { repo } from "@/lib/store";

// Pull 120 days of daily attention for every topic Brian is tracking and replay the forecaster over it.
const db = await repo.read();
const topics = [
  ...new Set(
    db.signals
      .filter((s) => s.sourceId === "wikipedia" || s.sourceId === "search")
      .map((s) => (s.sourceId === "search" ? s.topics[0] : decodeURIComponent(s.url.split("/wiki/")[1] ?? ""))),
  ),
].filter(Boolean);

const end = new Date(Date.now() - 86_400_000);
const start = new Date(end.getTime() - 119 * 86_400_000);
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
const series: number[][] = [];
for (const t of topics) {
  try {
    const r = await getJson<{ items: { views: number }[] }>(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(t.replace(/ /g, "_"))}/daily/${ymd(start)}00/${ymd(end)}00`,
    );
    if (r.items.length >= 60) series.push(r.items.map((i) => i.views));
  } catch (e) {
    console.log(`skip ${t}: ${(e as Error).message}`);
  }
  await sleep(150);
}
import { writeFileSync } from "node:fs";
writeFileSync(".data/backtest-series.json", JSON.stringify(series));
const result = { ranAt: new Date().toISOString(), ...backtest(series) };
await repo.update((d) => {
  d.backtest = result;
});
console.log(JSON.stringify(result, null, 2));
