// Digest one Learning example into Brian's brain and print what changed: `npx tsx scripts/digest.mts [swipeId]`. About $0.04.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { repo } = await import("@/lib/store");
const { digest, strength, health } = await import("@/lib/brain");
const db = await repo.read();
const s = process.argv[2] ? db.swipes?.find((x) => x.id === process.argv[2]) : db.swipes?.[0];
if (!s) throw new Error("No example");
console.log(`Digesting: ${s.title.slice(0, 100)}\n`);
const d = await digest(s.id);
for (const t of d.thinking) console.log(`${t.step}: ${t.thought}\n`);
const after = await repo.read();
console.log("Brain now:");
for (const n of after.brain ?? []) {
  const ch = d.touched.find((t) => t.nodeId === n.id)?.change;
  console.log(`[${n.kind}] ${n.brand ? `${n.brand}: ` : ""}${n.text}\n   ${n.detail}${n.gap ? `\n   Gap: ${n.gap}` : ""}\n   strength ${strength(n)}, ${health(n)}${ch ? `, ${ch}` : ""}`);
}
const q = after.brainQuestions?.find((x) => x.swipeId === s.id && !x.answer);
if (q) console.log(`\nBrian asks: ${q.text}`);
console.log(`\nLesson on the card: ${after.swipes?.find((x) => x.id === s.id)?.breakdown?.lesson}`);
