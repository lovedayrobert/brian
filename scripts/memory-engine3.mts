// One-off: record Rob's engine-3 feedback in Memory (16 Oct 2026). Safe to re-run.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { editMemory, teach } = await import("@/lib/memory");
const { repo } = await import("@/lib/store");

const RULE =
  "Simple content beats big campaigns. Nobody is doing big wild stunts: no IRL stunts, sponsorships, purchases, product drops or 'campaigns'. Every idea is a post, video, slideshow, meme, reply, recurring bit or tiny vibe-coded build that one or two people can make this week, that gets views on its own and fits how the new-gen audience is funny (deadpan, relatable, self-aware, absurd). If it sounds like AI or an agency wrote it, or it's cheesy or gimmicky, it's dead.";
const OLD_ATTENTION =
  "Get Cashy in front of as many people as possible with things that are good on their own and subtly carry Cashy's name (posting account, watermark, logo in the corner). Never an idea that tells people why Cashy is great.";

const db = await repo.read();
if (!db.memories.some((m) => m.text.startsWith("Simple content beats big campaigns"))) await teach(RULE, "rule");
const attention = db.memories.find((m) => m.text.startsWith("Aim for 10,000% attention"));
if (attention) await editMemory(attention.id, { text: OLD_ATTENTION });
console.log("Memory updated");
