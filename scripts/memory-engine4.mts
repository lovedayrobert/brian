// One-off: record Rob's engine-4 feedback in Memory (16 Oct 2026). Safe to re-run.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { editMemory, teach } = await import("@/lib/memory");
const { repo } = await import("@/lib/store");

export const ENGINE4_RULE =
  "Think like the audience, not a marketer. The plays that worked (Shuffle paying Jack Doherty to stop posting, Duel's offensive blackjack, Stake's logo on every viral video, a guy gambling on a kitchen-store fridge) were each ONE real act aimed at a feeling people already had: hate, outrage, love, wtf. Not a series, not a campaign, not a TikTok POV. One sentence, raw, a first, and impossible to retell without the brand's name. Fluffy, cringe or series-based ideas are dead.";

const db = await repo.read();
const old = db.memories.find((m) => m.text.startsWith("Simple content beats big campaigns"));
if (old) await editMemory(old.id, { forget: true });
if (!db.memories.some((m) => m.text.startsWith("Think like the audience, not a marketer"))) await teach(ENGINE4_RULE, "rule");
console.log("Memory updated");
