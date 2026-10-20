// One idea run on whatever server this runs on, for testing the pipeline: `npx tsx scripts/run-ideas.mts [lens]`.
// Spends real money (about $2 in max mode). Ask Rob first.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { generateIdeas } = await import("@/lib/pipeline/ideas");
const { spendStatus } = await import("@/lib/adapters/model");
const lens = process.argv[2] ?? "blank-page";
console.log("before", JSON.stringify(await spendStatus()));
const r = await generateIdeas({ brandId: "cashy", lens });
console.log("cards", r.cards.map((c) => `${c.id} | ${c.madeBy ?? "?"} | ${c.size ?? "?"} | ${c.name}`).join("\n"));
console.log("killed", r.killed.length);
console.log("after", JSON.stringify(await spendStatus()));
