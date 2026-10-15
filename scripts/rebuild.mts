import { rebuildFromStored } from "@/lib/pipeline/sweep";
import { repo } from "@/lib/store";

await rebuildFromStored();
const db = await repo.read();
console.log("Top Live moments (culture):");
for (const m of db.moments.filter((m) => m.kind === "breaking" && !m.industry).slice(0, 25))
  console.log(` ${m.sensitivity.padEnd(7)} ${m.category.padEnd(12)} ${m.title}`);
console.log(`\nIndustry: ${db.moments.filter((m) => m.industry).length}`);
