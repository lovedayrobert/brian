# 3. Agents and pipelines

Most of Brian's "agents" are typed pipeline steps: one model call with a role, a brief and a validated output schema. This is cheaper, faster and more auditable than open-ended agent loops, and every step is logged with tokens, cost and latency. Configuration lives in `src/lib/adapters/model/index.ts`.

## The agents

| Agent | Model | Effort | Job | Output |
|---|---|---|---|---|
| Cartographer | Claude Haiku 5.5 | low | Re-scores relevance and talkability of trends and moments; classifies memecoins; runs once per sweep | category, 0–1 talkability, one-line reason |
| Inventor | Claude Opus 5.5 | high | Ten attention-first candidates per trend, moment or Lab lens | name, one-liner, what happens, attention mechanic, borrowed attention, share moment, who amplifies, how Cashy rides along, headline, edge, backlash, key visual direction, cited evidence |
| Critic | Claude Opus 5.5 | high | Runs the five tests, checks the banned list, scores shareability, reach, novelty, attribution and cost, passes at most three | per-test pass/note, banned-pattern hit, scores with reasons, verdict |
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

### The quality bar (engine 2, attention-first)

- **The goal is attention**: shares, impressions and people talking. Ideas must be cool on their own, with Cashy riding along subtly but unmistakably (a name, a logo, a signature, an Easter egg). Cashy is the brand behind the stunt, never its subject.
- **The idea agents never see Cashy's product strengths.** The Inventor, Critic and Rapid Response get the brand voice and the rules only (`brandVoiceContext`); product facts are only given to the campaign build, for CTAs, landing pages and terms (`brandContext`).
- **Attention playbook**: hijack a moment, absurd real-world stunt, unexpected collab, parody product, troll the timeline, internet-native object, buy something ridiculous, creator chaos, Easter egg, character, mystery. Each run must use at least 6 different mechanics across its 10 candidates.
- **Reference stunts**: the four gambling benchmarks (Stake, Duel, Housebets, Shuffle) plus Burger King's Whopper Detour, KFC's 11 follows, Duolingo killing its owl, Liquid Death, MSCHF, Oreo's blackout tweet, Ryanair's TikTok and Kick's xQc signing.
- **Five tests**: one sentence, share (would a meme page repost it?), headline, argument, attribution (cool without the logo, but Cashy still unmistakably on it).
- **Critic scores**: shareability ×2, reach ×1.5, novelty ×1.5, attribution ×1, cost ×0.5.
- **Banned**: anything whose point is Cashy's product or strengths (payouts, wagering, win caps, bonuses, transparency, proof, trust, the Justice Fund), comparisons with rivals' terms, dashboards and data pages, explainers and PSAs, challenges, polls, races against everyday things, leaderboards and giveaways as innovation, renamed promotions, anything scroll-past.
- **Edge levels**: safe, spicy, wild. Brian leans spicy and wild.
- Ideas from the original USP-led engine are kept (`engine: 1`) but hidden by default.

### Red lines: the only hard stops

Illegal targeting (taking bets or pushing sign-ups where it's illegal), minors, hate speech and slurs, exploiting real tragedies, fake quotes, fake endorsements or defamation of real people, fraud or scams or data misuse, and targeting people showing signs of gambling harm. Red Lines defaults to pass: offensive, crude or dark humour, shock, taboo, roasting rivals and public figures, harmless pranks, and stunts that physically happen in markets where we don't take players all pass, with the consequence and the market for legal to check written out.

## Pipelines

### Ideas (`src/lib/pipeline/ideas.ts`)

1. Build context: trend evidence, moment sources, or a Lab lens with the evidence that lens needs (rival coverage for *Rival weak spots*, culture coins for *Crypto-native*, the calendar for *Calendar ambush*).
2. Inventor drafts ten.
3. Critic reviews all ten; at most three pass, ranked by `2×talkability + simplicity + 1.5×ownability + 0.5×cost`.
4. Red Lines and Prior Art run in parallel on the survivors. A red-line failure kills the idea with the reason shown.
5. Everything is saved, killed ideas included, so the owner can overrule the Critic.

Blocked trends and moments (tragedy filter) are refused before any model call.

### Red lines are a hard stop (`ensureRedLinesPass`, `checkSteeringRedLines`)

| Situation | What happens |
|---|---|
| Idea passed Red Lines | Can be developed |
| Idea failed Red Lines | Can't be developed, steered or handed over; the UI shows *Blocked by Red Lines* |
| Idea killed by the Critic before reaching Red Lines, then overruled | Red Lines runs first; development proceeds only on a pass |
| Steering instruction | Checked by Red Lines before anything regenerates |
| Rapid Response take that failed its check, or a blocked moment | Assets refused by the server |
| Linear push | Refused unless the idea passed Red Lines |

The Critic is taste and can be overruled; Red Lines is legal and safety and can't. All checks run on the server, so they can't be bypassed from the browser or by calling the API directly.

### Develop (`src/lib/pipeline/develop.ts`)

Eleven sections, each with its own Zod schema (`package-schemas.ts`) and declared dependencies:

| Section | Agent | Depends on |
|---|---|---|
| Insight | Strategist (+ Prior Art web research) | — |
| Strategy | Strategist | insight |
| Creative | Creative Director | strategy, insight |
| Mockups | Art Director (+ fal.ai images) | creative |
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

### Visuals: Art Director (`mockups` section, `src/lib/brand/formats.ts`)

Every asset gets its own native format instead of one key visual stamped everywhere. The Art Director (Opus 5.5) picks, per asset, from 15 formats, using at least 5 different ones across the 8 assets:

- **Exact layouts, built in code** (text must be right): meme, news headline, push notifications, receipt, official document, group chat, ticket or pass, typographic poster, app or web screen, quote card
- **Generated images (fal.ai)**: photograph, illustration, 3D render, product shot, collage; meme and headline formats also carry a generated image

Each visual has a palette (night, paper, acid, candy, mono), its own text and art direction, and Cashy present but small. Storyboard frames are generated as images; a teaser clip is made only on demand (`Make teaser video`), because video costs more. Every image and clip is reserved and charged against the hard spend cap. Without `FAL_KEY`, code formats still render and image formats show their art direction.

### Rapid Response (`src/lib/pipeline/rapid.ts`)

Three takes (format, edge, red-line check, risk note), then on approval: X post and variant, Instagram feed and story, TikTok hook and beats, Telegram, Discord, recommended posting time, visual direction and risk note.

### Discovery (`src/lib/pipeline/sweep.ts`)

See doc 4 for sources and ranking. The Cartographer step is skipped without a key; keyword heuristics are used instead and labelled *heuristic* in the UI.

## Opportunity Lab lenses (`src/lib/brand/lenses.ts`)

| Lens | Brief to the Inventor |
|---|---|
| Hijack what's happening | Get Cashy's name into what everyone's watching today, fast and first |
| Absurd real-world stunt | Something physical, filmed and impossible not to share |
| Unexpected collab | A partner nobody would expect next to a crypto casino |
| Parody product or drop | A ridiculous thing that exists only to be talked about |
| Troll the timeline | Cheeky public bait people pick sides on, never defamatory |
| Internet-native object | A bot, filter, game, site or coin people play with and share |
| Buy something ridiculous | Naming rights, absurd sponsorships, objects the internet cares about |
| Creator chaos | A creator deal so strange the deal is the content |
| Calendar ambush | Own a predictable moment without official-sponsor claims |
| Blank page | The most shared thing possible for under $50k |

Each run accepts an optional steer ("under $5k", "for fight night").
