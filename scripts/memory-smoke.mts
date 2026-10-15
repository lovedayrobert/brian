// Smoke test for memory logic. Run with the working directory set to a temp copy of .data.
import { editMemory, learnFromBehaviour, memoryForRun, recordFeedback, teach } from "@/lib/memory";
import { repo } from "@/lib/store";

const assert = (c: unknown, m: string) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok:", m); };
await repo.update((d) => { d.memories = []; d.memoryEvents = []; d.feedback = []; });

await teach("Never show real people's faces");
await recordFeedback({ target: { type: "idea", id: "i1", label: "Idea One" }, sentiment: "up", reason: "Uses on-chain data" });
await recordFeedback({ target: { type: "idea", id: "i2", label: "Idea Two" }, sentiment: "down" });
let db = await repo.read();
assert(db.memories.length === 2, "a rule and a reasoned verdict become memories; a bare thumb doesn't");
assert(db.feedback.filter((f) => !f.consolidated).length === 1, "the bare thumb waits for consolidation");

await learnFromBehaviour({ type: "steer", packageId: "p1", label: "Pkg", instruction: "Make it bolder" });
db = await repo.read();
assert(!db.memories.some((m) => m.text.startsWith("By default")), "one steer is not yet a preference");
await learnFromBehaviour({ type: "steer", packageId: "p2", label: "Pkg 2", instruction: "make it bolder!" });
db = await repo.read();
assert(db.memories.some((m) => m.text.startsWith("By default: make it bolder")), "the same steer twice becomes a standing preference");

await learnFromBehaviour({ type: "overrule", ideaId: "i3", label: "Killed Idea", criticReason: "Too niche" });
db = await repo.read();
assert(db.memories.some((m) => m.kind === "lesson" && m.text.includes("too harsh")), "overruling the Critic is learned");

const block = await memoryForRun("cashy", "testing");
assert(block.includes("Never show real people's faces") && block.includes("Rules:"), "active memories reach the agent brief");
db = await repo.read();
assert(db.memories.every((m) => m.usedCount === 1), "usage is counted");

const rule = db.memories.find((m) => m.kind === "rule")!;
await editMemory(rule.id, { active: false });
assert(!(await memoryForRun("cashy", "testing")).includes("real people's faces"), "paused memories are left out");
await editMemory(rule.id, { forget: true });
db = await repo.read();
assert(!db.memories.some((m) => m.id === rule.id) && db.memoryEvents.some((e) => e.type === "forgotten"), "forgetting removes it and logs it");
console.log("all memory checks passed");
