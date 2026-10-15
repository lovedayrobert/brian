# 3. Agents and pipelines

Most of Brian's "agents" are typed pipeline steps: one model call with a role, a brief and a validated output schema. This is cheaper, faster and more auditable than open-ended agent loops, and every step is logged with tokens, cost and latency. Configuration lives in `src/lib/adapters/model/index.ts`.

## The agents

| Agent | Model | Effort | Job | Output |
|---|---|---|---|---|
| Cartographer | Claude Haiku 5.5 | low | Re-scores relevance and talkability of trends and moments; classifies memecoins; runs once per sweep | category, 0–1 talkability, one-line reason |
| Inventor | Claude Opus 5.5 | high | Ten candidate ideas per trend, moment or Lab lens | name, one-liner, mechanism, borrowed attention, headline, edge, backlash, why it's ours, key visual direction, cited evidence |
| Critic | Claude Opus 5.5 | high | Runs the five tests, checks the banned list, scores, passes at most three | per-test pass/note, banned-pattern hit, scores with reasons, verdict |
| Red Lines | Claude Opus 5.5 | medium | Legal and safety hard stops; everything else listed as consequences | pass, issues, consequences |
| Prior Art | Claude Sonnet 5.5 + web search | medium | Has anyone done this? | found, summary, cited examples |
| Strategist | Claude Opus 5.5 | high | Insight, strategy, channel plan, business-case inputs, executive summary | per-section schema |
| Creative Director | Claude Opus 5.5 | high | Concept, key visual system, full copy deck, video script and storyboard, mechanic | creative schema |
| Producer | Claude Sonnet 5.5 | medium | Production plan, measurement plan, Linear handover | per-section schema |
| Rapid Response | Claude Opus 5.5 | medium | Three takes; post-ready assets on approval | takes; assets per channel |

Opus and Sonnet calls use Anthropic's server-side refusal fallback (`fallbacks: "default"`), so a declined request is rerouted rather than failing. Haiku has no server-side fallback.

### What every agent sees

Built in `src/lib/pipeline/context.ts` and `src/lib/memory.ts`:

1. **Memory**: active rules, preferences and lessons (doc 5)
2. **Role**: one paragraph on the job and the standard expected
3. **Brand book**: positioning, voice, tone examples, banned phrases, compliance rules, real advantages, campaign history
4. **Quality bar**: the six traits, the banned list, the five tests, edge levels, red lines, and the stunt library (Stake, Duel, Housebets, Shuffle)
5. **Accuracy rules**: cite only evidence URLs as given, `null` otherwise, label every number, never put words in a real person's mouth
6. **Evidence**: the trend, moment or lens context with the only URLs that may be cited

### The quality bar (summary)

- **Five tests**: one sentence, screenshot, headline, argument, copy (could Stake or Shuffle run it just as well?)
- **Banned**: challenges, polls, races against everyday things, leaderboards/giveaways/tournaments as innovation, standard promotions renamed, anything scroll-past, anything that needs a feature explained
- **Edge levels**: safe, spicy, wild. Brian leans spicy and wild.

## Pipelines

### Ideas (`src/lib/pipeline/ideas.ts`)

1. Build context: trend evidence, moment sources, or a Lab lens with the evidence that lens needs (rival coverage for *Rival weak spots*, culture coins for *Crypto-native*, the calendar for *Calendar ambush*).
2. Inventor drafts ten.
3. Critic reviews all ten; at most three pass, ranked by `2×talkability + simplicity + 1.5×ownability + 0.5×cost`.
4. Red Lines and Prior Art run in parallel on the survivors. A red-line failure kills the idea with the reason shown.
5. Everything is saved, killed ideas included, so the owner can overrule the Critic.

Blocked trends and moments (tragedy filter) are refused before any model call.

### Develop (`src/lib/pipeline/develop.ts`)

Eleven sections, each with its own Zod schema (`package-schemas.ts`) and declared dependencies:

| Section | Agent | Depends on |
|---|---|---|
| Insight | Strategist (+ Prior Art web research) | — |
| Strategy | Strategist | insight |
| Creative | Creative Director | strategy, insight |
| Mockups | code (+ image model) | creative |
| Channels | Strategist | strategy, creative |
| Business case | Strategist proposes inputs; **code computes** | channels, strategy |
| Production | Producer | creative, channels |
| Measurement | Producer | strategy, channels |
| Risk | Red Lines | creative, channels |
| Executive | Strategist (quotes computed scenarios only) | insight, strategy, creative, business, risk |
| Handover | Producer | production, creative |

Post-processing on every section:

- **URL sanitising**: any `url` not in the evidence (trend sources, research results, URLs validated into earlier sections) becomes `null`.
- **Business case**: inputs are sorted so low ≤ expected ≤ high, ratios clamped to 0..1, provenance downgraded if unsupported, then `computeAllScenarios()` produces the pessimistic, expected and optimistic funnels.
- **Fact check**: counts cited versus unsourced claims across the package and shows the result in the outline.

The launch date is fixed when the package is created: 7 days out for an emerging trend, 4 for rising, 10 otherwise.

**Steering** takes a section and an instruction, bumps the version, logs the instruction, marks that section and every downstream dependant pending, and reruns them with the instruction in their brief.

### Rapid Response (`src/lib/pipeline/rapid.ts`)

Three takes (format, edge, red-line check, risk note), then on approval: X post and variant, Instagram feed and story, TikTok hook and beats, Telegram, Discord, recommended posting time, visual direction and risk note.

### Discovery (`src/lib/pipeline/sweep.ts`)

See doc 4 for sources and ranking. The Cartographer step is skipped without a key; keyword heuristics are used instead and labelled *heuristic* in the UI.

## Opportunity Lab lenses (`src/lib/brand/lenses.ts`)

| Lens | Brief to the Inventor |
|---|---|
| Unfair advantages | Prove a real advantage publicly so the proof is the content |
| Product as media | A feature or mechanic whose existence is the story |
| Rival weak spots | Player complaints about rivals, used without defamation |
| Channels we can use | Attention where a casino is allowed or nobody has looked |
| Crypto-native plays | On-chain data, wallets, the trenches; privacy-safe |
| Deals and contracts | The structure of the deal is the headline; no implied consent from real people |
| Calendar ambush | Own a predictable moment without official-sponsor claims |
| Blank page | Anything that passes the five tests under $50k |

Each run accepts an optional steer ("under $5k", "for fight night").
