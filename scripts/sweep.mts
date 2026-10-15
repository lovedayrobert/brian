import { runSweep } from "@/lib/pipeline/sweep";
import { repo } from "@/lib/store";

const run = await runSweep();
const db = await repo.read();
console.log(`\nSweep ${run.id}: ${db.signals.length} signals, ${db.trends.length} trends, ${db.moments.length} moments`);
for (const s of run.sources) console.log(` ${s.ok ? "✓" : "✗"} ${s.sourceId} ${s.signals}${s.error ? " " + s.error : ""}`);
console.log("\nTop trends:");
for (const t of db.trends.slice(0, 15))
  console.log(` ${t.lifecycle.stage.padEnd(9)} ${t.lifecycle.confidence.padEnd(6)} rel ${t.relevance} ${t.sensitivity.padEnd(7)} ${t.category.padEnd(12)} ${t.title}  [${t.sourceIds.join(", ")}]`);
console.log("\nTop Live moments (culture):");
for (const m of db.moments.filter((m) => m.kind === "breaking" && !m.industry).slice(0, 25)) console.log(` ${m.kind.padEnd(8)} ${m.sensitivity.padEnd(7)} ${m.category.padEnd(12)} ${m.outlets ?? ""} ${m.title}`);
