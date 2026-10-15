// Develop one real package end to end and report each section.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
import { spendStatus } from "@/lib/adapters/model";
import { factCheck, runPackage, SECTION_ORDER, startPackage } from "@/lib/pipeline/develop";
import { repo } from "@/lib/store";

const name = process.argv[2];
const db0 = await repo.read();
const idea = db0.ideas.find((i) => i.name === name && !i.sample);
if (!idea) throw new Error(`No idea named ${name}`);
const t0 = Date.now();
const pkg = await startPackage(idea.id); // returns the existing package if there is one
await repo.update((d) => {
  const p = d.packages.find((x) => x.id === pkg.id)!;
  for (const k of SECTION_ORDER) if (p.sections[k].status === "error") p.sections[k] = { ...p.sections[k], status: "pending", error: undefined };
});
await runPackage(pkg.id);
const p = (await repo.read()).packages.find((x) => x.id === pkg.id)!;
for (const k of SECTION_ORDER) console.log(`  ${k.padEnd(12)} ${p.sections[k].status}${p.sections[k].error ? "  " + p.sections[k].error!.slice(0, 200) : ""}`);
const fc = factCheck(p);
console.log(`fact check: ${fc.total - fc.unresolved.length}/${fc.total} cited`);
console.log(`package ${pkg.id} in ${Math.round((Date.now() - t0) / 1000)}s`);
const s = await spendStatus();
console.log(`spend today $${s.spentToday.toFixed(2)}`);
