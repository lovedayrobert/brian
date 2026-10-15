# 5. Memory

Brian learns the owner's taste and applies it to every agent. Code: `src/lib/memory.ts`. Screen: **Memory**.

## Memory types

| Kind | Meaning | How agents treat it |
|---|---|---|
| Rule | A hard requirement ("never show real people's faces") | Must follow |
| Preference | A taste to lean towards | Shapes judgement unless it clashes with a red line or the facts |
| Lesson | A pattern learned from experience | As preference |

Each memory records its source (taught, feedback, behaviour, consolidated), weight (supporting signals), active flag, creation and update times, usage count, last use, and links to the ideas or packages it came from.

## How memories are created

| Signal | Rule |
|---|---|
| Teach (Memory screen) | Becomes a memory immediately, as the chosen kind |
| Verdict with a reason (idea or package) | Becomes a preference immediately |
| Verdict without a reason | Stored as feedback; waits for consolidation |
| Thumbs-down + *remove from shortlist* | Idea is killed with "Rejected by you"; reason becomes a preference |
| Developing an idea the Critic killed | Lesson: "The Critic was too harsh on …" |
| Steering | Logged; the same instruction twice (normalised) becomes a standing preference "By default: …"; further repeats raise its weight |
| Consolidation (AI) | Reads unconsolidated feedback and writes 1–4 lessons supported by it, with the supporting count as weight |

## How memories are used

`memoryForRun(brandId, purpose)` returns a `<memory>` block (rules, then preferences, then lessons; top 40 by weight) that is placed first in the system prompt of the Inventor, Critic, every Develop section and Rapid Response. Each call increments usage on the included memories and logs a *Remembered* event, so the screen shows what actually shapes the output.

## Control

Every memory can be edited, paused (left out of briefs) or forgotten (deleted). Every change is a timeline event: feedback, learned, remembered, edited, paused, forgotten, found a pattern.

## Seeded memories

`npx tsx --tsconfig tsconfig.json scripts/seed-memory.mts` (idempotent) adds four lessons from the owner's feedback while Brian was built: original ideas matter as much as trend reactions; culture and drama beat trade news; find open channels rather than disguising promotion past platform rules; memecoins are a research signal, not a focus.

## Testing

`scripts/memory-smoke.mts` runs nine checks against a temporary copy of the data (bare thumbs wait, reasoned verdicts are learned, one steer is ignored but two are learned, overrules are learned, memories reach briefs, usage is counted, paused memories are excluded, forgetting removes and logs).
