// Real idea runs, in parallel, to judge the engine. Usage: npm run smoke -- trend:<id> lens:<id> ...
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
import { spendStatus } from "@/lib/adapters/model";
import { emotionName, moveName } from "@/lib/brand/quality-bar";
import { generateIdeas } from "@/lib/pipeline/ideas";

const subjects = process.argv.slice(2).map((a) => {
  const [k, v] = a.split(":");
  return k === "trend" ? { trendId: v } : k === "moment" ? { momentId: v } : { lens: v };
});
const t0 = Date.now();
const results = await Promise.allSettled(subjects.map((s) => generateIdeas({ brandId: "cashy", ...s })));
results.forEach((r, i) => {
  console.log(`\n=== ${JSON.stringify(subjects[i])}`);
  if (r.status === "rejected") return console.log("FAILED:", (r.reason as Error).message);
  for (const c of r.value.cards)
    console.log(`  CARD [${c.edge}] [${moveName(c.attentionMechanic ?? "")} / ${emotionName(c.emotion ?? "")}] ${c.name}\n       Shared as: "${c.shareMoment}"\n       How: ${c.howItWorks}\n       Panel: ${(c.reactions ?? []).map((r) => `${r.shares ? "+" : "-"} ${r.who}: ${r.says}`).join("\n              ")}`);
  for (const k of r.value.killed) console.log(`  kill  ${k.name}: ${k.screening.critic.reasons[0]?.slice(0, 100)}`);
});
const s = await spendStatus();
console.log(`\n${Math.round((Date.now() - t0) / 1000)}s · spend today $${s.spentToday.toFixed(2)}`);
