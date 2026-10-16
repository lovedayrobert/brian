# Brian: complete documentation

Generated from the `docs/` folder of the Brian repository, combined into one file so it can be read in a single pass.


---

# 1. Overview

Brian is Cashy's AI marketing engine. It runs a team of specialised AI agents that watch internet culture, invent ideas only Cashy could run, and develop the chosen idea into a complete, agency-grade campaign package with a fully briefed project for the team.

This folder is the full documentation. Start here, then read in order:

1. **Overview** (this file): what Brian does and how the pieces fit
2. [Architecture](02-architecture.md): stack, code layout, data model, request flows
3. [Agents and pipelines](03-agents-and-pipelines.md): every agent, what it receives, what it returns, how the pipelines chain them
4. [Sources, accuracy and forecasting](04-sources-and-accuracy.md): data sources, how claims and numbers are kept honest, the lifecycle model and its backtest
5. [Memory](05-memory.md): how Brian learns from feedback
6. [Operations](06-operations.md): setup, configuration, login, spend caps, scripts, tests, costs, known limits, roadmap
7. [Importing data](07-data-import.md): Brian Signal Format v1 for partner feeds (X, Exa, Google Trends history, Telegram)

## What it does

| Area | What happens |
|---|---|
| **Discover** | Sweeps news, search, creator and streaming culture, crypto and industry press several times a day. Groups signals into trends, measures each trend's lifecycle stage from its attention curve, ranks breaking moments by how likely people are to talk about them, and blocks anything involving deaths, disasters, violence or minors. |
| **Invent** | Two routes. From a trend or breaking moment, or from the **Opportunity Lab**, which invents original ideas through eight lenses (unfair advantages, product as media, rival weak spots, open channels, crypto-native plays, deals, calendar ambush, blank page). Each run drafts ten ideas; a deliberately harsh Critic kills most; survivors pass a legal and safety check and a live web search for prior art. |
| **React** | Rapid Response: three reactive takes on a breaking moment in under a minute, then post-ready copy for every channel on approval. Nothing is ever posted automatically. |
| **Develop** | Eleven-section campaign package: executive summary, insight, strategy, creative, mockups in real platform frames, channel plan, business case, production plan, measurement plan, risk and compliance, Linear handover. Sections generate in dependency order with live progress; plain-English steering regenerates the affected section and everything downstream. |
| **Learn** | Memory: verdicts, Critic overrules, repeated steering and rules you teach become memories injected into every agent's brief, with a full timeline. |
| **Report** | Coverage and cost planner, per-agent spend and latency, and an honest backtest of the lifecycle forecaster. |

## Principles enforced in code

- **No source, no claim.** Any URL an agent writes that isn't in Brian's evidence is replaced with `null` and shown as *unsourced*.
- **Every number has provenance.** Inputs are labelled measured, benchmark or assumption. A "benchmark" without a real citation is relabelled "assumption"; "measured" is impossible until Cashy's own data is connected.
- **Models never do arithmetic.** Funnels, budgets, lifecycle stages and backtests are pure, tested TypeScript.
- **Humans ship.** Nothing posts, publishes or deploys automatically.
- **Edgy is allowed; red lines are not.** Rival-baiting and controversy are flagged with consequences, never removed. Illegal content, minors, real-person impersonation, tragedies and harm to vulnerable players are hard stops, enforced on the server: the Critic can be overruled, Red Lines can't.
- **Spend is capped.** Every AI call reserves its worst-case cost first and is refused if it could pass the daily or monthly cap.
- **Nothing is open.** Every page and API action requires a sign-in; production refuses to run without login configured.

## Current state (October 2026)

| | Status |
|---|---|
| Discovery, trends, lifecycle, Live, calendar, safety filter | Working on live data from free sources |
| Lifecycle backtest | Working; results reported honestly (see doc 4) |
| Coverage and cost planner | Working |
| Ideas, Lab, Develop | Run end to end against the API: idea batches about $1 and 4–5 minutes each, a full package about $2.40 and 10 minutes |
| Rapid Response, Memory consolidation | Built; not yet exercised against the API |
| Visuals | Art Director gives every asset its own format; code formats render now, image formats and storyboard frames need `FAL_KEY` |
| Mockups | Working (code-built visuals; generated key visuals with `OPENAI_API_KEY`) |
| Linear push | Built; needs `LINEAR_API_KEY` and `LINEAR_TEAM_ID` |
| Paid sources (X, Reddit, TikTok, Kick, on-chain analytics) | Slots and catalogue ready; adapters added once budget is approved |
| Login, hard spend cap, red-line hard stop | Working and tested |
| Partner feed import (`/api/ingest`, `data/inbox`) | Working and tested |
| Blind review (`npm run eval`, `/review/:id`) | Built; runs when the AI key is set |
| Hosting | Runs locally; production plan in doc 6 |

A clearly labelled sample package (*The Win Cap Bounty*) can be loaded with `npm run demo` to show the output format before the AI key is connected.


---

# 2. Architecture

## Stack

| Layer | Choice | Notes |
|---|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript | Server components for screens; route handlers for actions |
| Styling | Tailwind CSS 4, custom design tokens | Light and dark themes in `src/app/globals.css` |
| AI | Anthropic TypeScript SDK (`@anthropic-ai/sdk`) | Structured outputs via Zod; server-side web search; refusal fallbacks |
| Validation | Zod 4 | Every agent output is schema-validated |
| Tests | Vitest | Pure engine code: lifecycle, backtest, funnel, budget, safety, costs |
| Storage (prototype) | Local JSON file behind a `Repository` interface | `.data/brian.json`, not committed |
| Storage (hosted) | Supabase Postgres + pgvector | Schema in `supabase/migrations/0001_init.sql` |

## Code layout

```
src/
  app/                       Screens and API routes
    page.tsx                 Today
    live/ trends/ lab/ ideas/ develop/ mockups/ campaigns/ competitors/ results/ memory/ settings/
    api/                     sweep, ideas, develop (+ steer, linear), rapid (+ assets), feedback, memory
  components/                Shell, design system (ui.tsx), cards, cost planner, feedback, memory controls
    mockups/                 Platform frames (X, Instagram, TikTok, landing page, Telegram, Discord) and key visual
    package/                 Package view and one renderer per section
  lib/
    domain/types.ts          Core data model
    engine/                  Pure maths: lifecycle, backtest, funnel, relevance, safety (all tested)
    adapters/
      sources/               One file per data source + registry
      model/                 Single entry point to Claude: per-agent config, cost/latency log, web research
      image/                 Key visual generation
      tasks/linear.ts        Linear project and issue creation
    pipeline/                sweep, enrich, cartographer, narratives, ideas, develop, rapid, context, package-schemas
    brand/                   Brand books, advantages, quality bar, stunt library, calendar, Lab lenses
    config/sources.ts        Source catalogue: access, terms, cost estimates, presets
    memory.ts                Memory: feedback, behaviour learning, teaching, consolidation, injection
    store/                   Repository interface and file implementation
    queries.ts, format.ts    Read helpers and formatting
scripts/                     sweep, backtest, demo, seed-memory, rebuild, smoke tests
supabase/migrations/         Postgres schema for the hosted build
docs/                        This documentation
```

## Design rules

1. **Everything external sits behind an adapter.** Data sources implement `SourceAdapter` (`ready()`, `fetchSignals()`); models go through `callStructured()` and `research()`; images through `generateKeyVisual()`; Linear through `pushToLinear()`. Swapping a provider means one file.
2. **Missing keys switch features off, never break the app.** Each adapter reports readiness; the UI explains what's missing.
3. **Pure engine, impure edges.** Anything that produces a number lives in `src/lib/engine` with tests. Pipelines orchestrate; they don't calculate.
4. **One repository interface.** All reads and writes go through `repo.read()` / `repo.update(fn)`. The file implementation serialises writes and renames atomically. Moving to Postgres means implementing the interface once.

## Data model

Defined in `src/lib/domain/types.ts`, mirrored in `supabase/migrations/0001_init.sql`.

| Entity | Purpose | Key fields |
|---|---|---|
| `Signal` | One item from a source | `sourceId`, `url`, `title`, `metric`, `series` (daily curve), `rates`, `related`, `coin`, `narrative` |
| `Trend` | Something with a measurable curve | `series`, `lifecycle` (stage, confidence, evidence), `relevance` (+ method), `sensitivity`, `signalIds` (linked evidence), `coins` |
| `Moment` | Breaking news or a dated event | `kind` (breaking/calendar), `sources`, `outlets`, `searches`, `industry`, `trenchFirst`, `sensitivity` |
| `Idea` | A candidate or card | `origin` (trend/moment/lab), `lens`, one-liner, headline, edge, backlash, `evidence: Claim[]`, `scores`, `screening` (critic, redLines, priorArt), `status`, `sample` |
| `Claim` / `Citation` | Every factual statement | `status` verified/unresolved; citations only from held evidence |
| `Input` | Every number in a business case | `low/expected/high`, `provenance`, `origin`, `citation` |
| `Package` | A developed campaign | `sections` (11, each with status, content, model), `launchDate`, `steering[]`, `version`, `sample` |
| `RapidResponse` | Takes and assets for a moment | `takes`, `chosen`, `assets` |
| `Memory` / `MemoryEvent` / `Feedback` | Learning | kind (rule/preference/lesson), source, weight, active, usage; timeline events; raw verdicts |
| `AgentRun` | Audit and cost log | agent, model, tokens, cost, latency, ok/error, subject |
| `SweepRun` / `BacktestResult` | Operations | per-source results; forecaster accuracy |

## Request flows

**Sweep** (`POST /api/sweep` or `npm run sweep`)

```
ready adapters ──► signals ──► enrich (search spikes + Wikipedia curves)
                               │
                               ├─► buildTrends (lifecycle, relevance, sensitivity, linked evidence)
                               ├─► buildBreaking (cluster articles, talkability rank, industry split)
                               ├─► buildCalendar (curated + dated events)
                               ├─► narrateCoins (classify, link to moments, trench-first moments)
                               └─► Cartographer (Haiku re-scores relevance, when the key is set)
                                   ──► repo
```
A source that fails keeps its last good signals, and the sweep record says so.

**Ideas** (`POST /api/ideas` with `trendId`, `momentId` or `lens`)

```
context (trend evidence | moment sources | lens + evidence) + memory
  ──► Inventor (10) ──► Critic (5 tests, scores, ≤3 pass)
  ──► Red Lines ∥ Prior Art (web search) on survivors ──► cards + killed (with reasons)
```

**Develop** (`POST /api/develop`, then the page polls `GET /api/develop/:id`)

```
stage 1  insight (web research)
stage 2  strategy
stage 3  creative
stage 4  mockups ∥ channels
stage 5  business ∥ production ∥ measurement ∥ risk
stage 6  executive ∥ handover
```
Each section saves as it finishes. Steering (`POST /api/develop/:id/steer`) marks the chosen section and its downstream dependants pending and reruns them.

**Rapid Response**: `POST /api/rapid` (three takes) then `POST /api/rapid/:id/assets` (post-ready copy for the approved take).

**Memory**: `POST /api/feedback`, `POST /api/memory` (teach), `PATCH /api/memory/:id` (edit, pause, forget), `POST /api/memory/consolidate`.

## Production architecture (planned)

| Concern | Prototype | Hosted |
|---|---|---|
| Storage | JSON file | Supabase Postgres + pgvector (schema ready) |
| Long jobs | In the web process | Job queue (Trigger.dev) for sweeps, packages, renders |
| Scheduling | Manual | Scheduled sweeps; daily summary |
| Files | `public/generated` | Supabase Storage |
| Auth | None (local) | Supabase Auth, team roles |
| Hosting | `next dev` | Vercel (check the host's policy for gambling-related content) |


---

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

Defaults and what we learned testing them (October 2026):
- Images: `fal-ai/flux-pro/v1.1-ultra`, $0.06 each, about 12 seconds. The safety checker stays on at tolerance 4: at its strictest it blanked a harmless underwater slot machine. A still-flagged result is refused rather than saved as a black image. Prompts never use words like "children", even in a "no …" instruction, because the checker reacts to the word.
- Video: `fal-ai/kling-video/v3/turbo/standard/text-to-video`, $0.112 a second (about $0.56 for 5 seconds), 1–3 minutes.
- Image and video models garble lettering, so exact text belongs in the code formats; image and video prompts ask for no readable text.
- Generated files are stored in `.data/generated` and served by `/generated/:name` behind the login (files added to `public` after a production build aren't served).

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


---

# 4. Sources, accuracy and forecasting

## Sources

The full catalogue, with access status, terms notes and cost estimates, is in `src/lib/config/sources.ts` and on the Settings → Coverage & cost screen.

### Live today (free)

| Source | Adapter | Used for |
|---|---|---|
| Google trending searches (US, UK, CA, AU) | `googletrends.ts` (public RSS) | Search spikes with approximate volume and the news behind them |
| Culture press | `press.ts` (RSS) | Dexerto (Kick, Twitch, YouTube, TikTok, entertainment), Daily Dot, 404 Media, Kotaku, Polygon |
| Crypto culture | `press.ts` | Protos, Rekt News (exploits, scandals) |
| Trade press | `press.ts` | Next.io, SBC News, iGaming Business, iGaming Expert, CoinDesk, Cointelegraph, Decrypt; shown under *Industry*, used for Competitors and the Lab |
| Wikipedia pageviews | `wikipedia.ts` + `pipeline/enrich.ts` | Supporting data only: 30-day attention curves for lifecycle staging and backtesting |
| GDELT | `gdelt.ts` | Topic watchlists with 30-day article volume; throttled by IP, with a circuit breaker and carry-over |
| Polymarket | `polymarket.ts` | Supporting context only; ranked lowest, excluded from the launch window |
| Memecoins (pump.fun) | `trenches.ts` (GeckoTerminal + DexScreener public APIs) | Research signal: coins named after memes or moments, ranked by last-hour activity and unique buyers; dead coins and established tokens dropped |
| YouTube | `youtube.ts` | Trending gaming and entertainment video; needs a free API key |

### Ready to connect (budget or agreement)

X (Basic/Pro), Reddit (data agreement for commercial use), TikTok and Instagram (licensed listening vendor; scraping breaches their terms), Kick, Twitch, Telegram, Google Trends history (official API alpha or SerpApi), commercial news API, Dune, Arkham, Etherscan, crawling and search (Firecrawl, Exa, Apify).

### Adding a source

1. Create `src/lib/adapters/sources/<name>.ts` implementing `SourceAdapter`.
2. Add it to `IMPLEMENTED` in `registry.ts`.
3. Put its keys in `.env.local`; the catalogue entry already exists.

Signals with a daily `series` become trends; signals with `rates` (rolling averages) become trends staged from rates; articles become breaking moments and evidence.

## Ranking

**Trends** are ranked by `sourceWeight × relevance × stageWeight × (0.5 + confidence/2)`, with blocked trends multiplied by 0.2. Supporting sources are weighted down (Wikipedia 0.45, Polymarket 0.3).

**Breaking moments** are ranked by talkability, not topic match:
- base: 0.4 × topic relevance
- culture sources +0.3, search spikes +0.15, drama vocabulary +0.3, casino-adjacent culture +0.2
- regulatory and corporate vocabulary −0.35, trade-only clusters −0.4
- multiplied by outlet count and search volume (log-scaled); blocked moments × 0.1

With the AI key, the Cartographer replaces the heuristic with a model judgement of talkability for the top 120 items.

## Safety filter (`src/lib/engine/safety.ts`)

Runs before any idea generation. Deliberately over-inclusive.

- **Blocked**: death and loss of life (including biographies whose dates end this year), violence and attacks, disasters, accidents with victims, war, anything that may involve minors, abuse
- **Caution**: hacks and exploits (react to the event, never mock victims), political figures, legal matters, responsible-gambling topics

The model-based Red Lines agent is a second check on every idea.

## Accuracy enforcement

| Rule | Where it's enforced |
|---|---|
| Agents may cite only URLs in the evidence | `resolveUrl()` in `context.ts`; `sanitizeUrls()` in `develop.ts` |
| Unsourced claims are shown, not hidden | `Claim.status = "unresolved"`; amber *unsourced* tag in the UI; fact-check count per package |
| Numbers carry provenance | `Input.provenance`; "benchmark" without a citation and any "measured" (no own data yet) become "assumption" |
| Models never calculate | `engine/funnel.ts`, `engine/lifecycle.ts`, `engine/backtest.ts` |
| The executive summary only quotes computed numbers | Scenarios are passed in; the prompt forbids other figures |
| Advantages need proof | Advantage inventory shows *proof link needed* until supplied |

## Lifecycle model (`src/lib/engine/lifecycle.ts`)

Deterministic and explainable, so it can be audited and backtested. From a daily series:

- `velocity` = mean of the last 3 days ÷ mean of the 3 before
- `peakRatio` = last-3 mean ÷ 30-day peak; `baselineRatio` = last-3 mean ÷ early baseline (median of the first third)
- **Declining** if velocity < 0.8 and the peak was 3+ days ago
- **Saturated / declining** if far below peak (< 0.5) and not growing
- **Emerging** if velocity ≥ 1.3 from a low base (< 3× baseline)
- **Rising** if velocity ≥ 1.15
- **Peaking** if within 80% of a peak in the last 3 days
- otherwise **Saturated** (if well above baseline) or **Peaking**

Confidence drops for low volume, noisy series, readings near a boundary and short histories. Polymarket-style rolling averages use `assessFromRates()`, capped at medium confidence.

## Backtest (`src/lib/engine/backtest.ts`, `npm run backtest`)

Walk-forward with no look-ahead: on each day the stage is computed from the trailing 30 days only, then scored against the next 14 days.

- Emerging/Rising is correct if attention grows ≥ 10% above today
- Declining is correct if the next-14-day average is below today
- Peaking/Saturated is correct if attention doesn't grow more than 30%
- Compared against naive momentum ("up over the last three days means rising")

**Latest result (60 topics, 120 days, 5,039 calls):**

| | Brian | Naive momentum |
|---|---|---|
| Launch-window calls (Emerging + Rising) right | **74%** (1,334 calls) | **77%** (2,432 calls) |
| All calls | 46% | 54% |

By stage: Emerging 76%, Rising 73%, Peaking 44%, Saturated 28%, Declining 34%.

On free attention data alone, the rules don't yet beat simple momentum. This is shown on the Accuracy screen rather than hidden. The planned improvements are cross-platform spread (X, Reddit, TikTok) as an input and recalibration against real campaign results.

## Funnel maths (`src/lib/engine/funnel.ts`)

`reach → engagements (engagementRate)`, `reach → visits (clickThroughRate) → sign-ups (signupRate) → FTDs (ftdRate)`, `cost per FTD = budget ÷ FTDs` (null below half an FTD).

- Pessimistic uses low volumes and rates with the high budget; optimistic the reverse
- `validateInput()` rejects negatives, unordered ranges and ratios above 1
- `scaleBudget()` scales spend and only the paid share of reach (for steering like "cut the budget in half")
- `allocateBudget()` splits a total by weight using the largest-remainder method so parts always sum exactly


---

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


---

# 6. Operations

## Requirements

- Node.js 22+
- npm 10+
- Optional API keys (see below). With none, discovery, trends, the backtest, the cost planner and mockups still work.

## Setup

```bash
npm install
cp .env.example .env.local
npm run sweep        # pull live signals (about 2–5 minutes; GDELT is rate-limited)
npm run backtest     # score the lifecycle model on 120 days of history
npx tsx --tsconfig tsconfig.json scripts/seed-memory.mts   # optional: seed memory
npm run demo         # optional: load the labelled sample package
npm run dev          # http://localhost:3000
```

## Configuration (`.env.local`)

| Variable | Turns on |
|---|---|
| `BRIAN_USERS`, `BRIAN_SESSION_SECRET` | Login (required in production) |
| `BRIAN_DAILY_CAP_USD`, `BRIAN_MONTHLY_CAP_USD` | Hard AI spend caps (defaults 50 and 300) |
| `BRIAN_INGEST_TOKEN` | Partner feed import endpoint |
| `ANTHROPIC_API_KEY` | All agents: ideas, Lab, Critic, Red Lines, Prior Art, packages, Rapid Response, Cartographer, memory consolidation |
| `FAL_KEY`, `FAL_IMAGE_MODEL`, `FAL_VIDEO_MODEL`, `FAL_IMAGE_COST_USD`, `FAL_VIDEO_COST_USD` | Generated images, storyboard frames and teaser clips via fal.ai, charged against the spend cap |
| `YOUTUBE_API_KEY` | YouTube trending |
| `LINEAR_API_KEY`, `LINEAR_TEAM_ID` | Push to Linear |
| `SLACK_WEBHOOK_URL` | Alerts and daily summary (planned) |
| X, Reddit, Twitch, Kick, Telegram, Dune, Arkham, SerpApi, Firecrawl, Exa, Apify keys | Reserved for their adapters |

Secrets live only in `.env.local`, which is git-ignored. `.data/` (local database) and `public/generated/` (images) are also ignored.

## Login

- Set `BRIAN_USERS` (`name:password,name2:password2`) and `BRIAN_SESSION_SECRET` (32+ random characters).
- Every page and API action then requires a sign-in. Sessions are HMAC-signed, HttpOnly, SameSite=Lax cookies lasting 7 days (Secure in production).
- Checked twice: in `src/proxy.ts` for every request, and again inside every API route (`requireUser`).
- Cross-site POSTs are refused; login attempts are limited to 5 a minute per address.
- In production, if login isn't configured, Brian refuses every request rather than running open. Locally it runs without login and Settings says so.
- The partner import endpoint uses its own bearer token (`BRIAN_INGEST_TOKEN`), not a user login.

## Hard spend cap

- `BRIAN_DAILY_CAP_USD` (default 50) and `BRIAN_MONTHLY_CAP_USD` (default 300), UTC days and months.
- Before every model call Brian reserves its worst-case cost: the full output budget, a conservative input estimate, the pricier of the model and its refusal fallback, and every allowed web search with a token allowance. The call is refused if spend + in-flight reservations + this call could pass either cap. Actual cost replaces the reservation afterwards.
- Spend is kept in a ledger that is never trimmed, so caps stay accurate however many calls run.
- The one thing that can't be bounded exactly is how many tokens web search results add; research calls reserve 25,000 tokens per allowed search. Set a spend limit in the Anthropic Console as a second backstop.
- Settings → Models shows today's and this month's spend against the caps.

## Using a Claude plan's credits

Since 7 October 2026, Max and Team plans include monthly API credits that cover the Claude API. Link a Claude Console organisation in the plan's billing settings, create an API key in that organisation and use it as `ANTHROPIC_API_KEY`. No code changes are needed.

## Blind review

`npm run eval` produces the agreed blind test: a fresh sweep on free sources only, every card Brian produces in order until 20 (nothing removed), packages for Brian's own top 2 cards, then a frozen review shuffled once. The reviewer rates at `/review/:id`; scores, labels and packages stay hidden until every card is rated; the pass mark (3 of 20) is fixed in advance. Every verdict also feeds Memory.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run sweep` | Full discovery sweep |
| `npm run backtest` | Lifecycle backtest; caches series in `.data/backtest-series.json` |
| `npm run demo` / `npm run demo -- --remove` | Load or remove the sample package |
| `npm run eval` | Generate the blind review set (needs the AI key) |
| `npm test` | Unit tests (69) |
| `npm run typecheck` / `npm run lint` | Types and lint |
| `scripts/rebuild.mts` | Rebuild trends and moments from stored signals without refetching (ranking tuning) |
| `scripts/seed-memory.mts` | Seed memory with the owner's feedback |
| `scripts/memory-smoke.mts` | Memory logic checks (run against a temp copy of `.data`) |
| `scripts/ui-fixture.mts` | Placeholder package for visual checks; remove with `--remove` |

## Tests

`npm test` covers the lifecycle model (each stage, confidence, determinism, rates), the walk-forward backtest, funnel maths and validation, budget scaling and allocation, cost presets, the safety filter, relevance and cross-source matching, Google Trends volume parsing, memecoin ranking and filtering, and coin classification.

## Running costs (estimates, to confirm with providers)

| | Lean | Notes |
|---|---|---|
| Always-on radar | about $400–750 / month | Claude for the radar ($100–300), hosting ($100–250), X Basic (about $200) |
| Campaign builds | about $5–30 each | About 10 Opus calls plus web research, imagery, optional video frames |

Standard adds Reddit, Google Trends history, on-chain data and crawling. Full adds X Pro (about $5,000/month) and a TikTok/Instagram listening vendor. Live per-agent spend is on Settings → Models.

Claude pricing used: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50 per million input/output tokens; web search $10 per 1,000 searches.

## Known limits

- Rapid Response and memory consolidation haven't been exercised against the API yet; ideas, Lab and full packages have.
- Image formats show their art direction until `FAL_KEY` is set; code formats render either way.
- Storage is a local file and long jobs run in the web process; production needs Postgres and a job queue.
- GDELT throttles by IP; the sweep carries over its last good data.
- Without the AI key, relevance and coin classification are keyword heuristics and are labelled as such; coin links to moments are switched off until the model has read the coins.
- The lifecycle model does not yet beat naive momentum (doc 4).
- Brand visual identity is a placeholder until Cashy's logo, fonts and colours are supplied.
- Login is shared-password per user from environment variables; move to Supabase Auth for the hosted build.

## Roadmap

| Phase | Scope |
|---|---|
| Now | Format-native visuals with image and video generation; run the blind test; secure access for reviewers |
| Next | X adapter; real brand assets; Postgres and job queue; hosted deployment with auth; scheduled sweeps and Slack summary |
| Then | Reddit, Kick, TikTok via vendor; competitor tracking; creator shortlists from live data; video storyboards; Figma export; comments and versions UI; BitStarz |
| Later | Analytics integration, live campaign dashboards, forecast versus actual, recalibration of the forecaster |


---

# 7. Importing data (Brian Signal Format v1)

Any feed that already runs elsewhere (X, Exa, Google Trends history, Telegram, anything else) gets into Brian through one format. Brian doesn't need to know how the data was collected.

## Format

JSON Lines: one JSON object per line, UTF-8. A JSON array of the same objects also works.

| Field | Required | Type | Notes |
|---|---|---|---|
| `source` | yes | string | Lowercase letters, numbers, dashes. e.g. `x`, `exa`, `google-trends`, `telegram` |
| `id` | yes | string | Unique within the source. Re-sending the same `source` + `id` updates the record |
| `url` | yes | URL | Link to the original (post, message, article, explore page). Agents may only cite URLs Brian holds, so this matters |
| `title` | yes | string ≤ 500 | Headline, or the post or message text |
| `text` | no | string ≤ 5,000 | Full text or description |
| `author` | no | string | Handle, channel or outlet |
| `published_at` | no | ISO 8601 with offset | e.g. `2026-10-15T10:00:00Z`. Records older than 14 days drop out |
| `metrics` | no | object of numbers | Any counts: `views`, `likes`, `reposts`, `replies`, `members`, `volume`, … |
| `primary_metric` | no | string | Which metric Brian should show and rank by |
| `series` | no | array of `{date, value}` | Daily history, oldest or newest first (`date` as `YYYY-MM-DD`). A record with a series becomes a **trend** with a lifecycle stage; without one it is treated like an **article** and clustered into Live moments |
| `topics` | no | array of strings | Hashtags, channel tags, categories |
| `image_url` | no | URL | Thumbnail |
| `related` | no | array of `{title, url, outlet}` | Supporting links, e.g. the news behind a search spike |

### Examples, one per line

```json
{"source":"x","id":"1846000000000000001","url":"https://x.com/someone/status/1846000000000000001","title":"Kick streamer gets max-win capped live and loses it on stream","author":"@clipaccount","published_at":"2026-10-15T09:12:00Z","metrics":{"views":412000,"reposts":3100,"replies":880},"primary_metric":"views","topics":["kick","casino"]}
{"source":"exa","id":"https://example.com/story","url":"https://example.com/story","title":"Crypto casino streamers face new sponsorship rules","text":"First paragraph of the article…","author":"Example News","published_at":"2026-10-15T07:00:00Z"}
{"source":"google-trends","id":"gta-6-us","url":"https://trends.google.com/trends/explore?geo=US&q=gta%206","title":"gta 6","metrics":{"interest":100},"series":[{"date":"2026-10-13","value":61},{"date":"2026-10-14","value":78},{"date":"2026-10-15","value":100}],"topics":["US"]}
{"source":"telegram","id":"cryptocasinochat:55123","url":"https://t.me/cryptocasinochat/55123","title":"Anyone else get their withdrawal frozen this week?","author":"Crypto Casino Chat","published_at":"2026-10-15T11:40:00Z","metrics":{"views":5400,"replies":212},"primary_metric":"views"}
```

## Two ways to send it

**1. Push (recommended for live feeds)**

```bash
curl -X POST https://<brian-host>/api/ingest \
  -H "Authorization: Bearer $BRIAN_INGEST_TOKEN" \
  --data-binary @batch.jsonl
```

- Up to 5,000 records and 20 MB per request; send as often as you like
- The response says how many were accepted and lists bad lines with line numbers; good lines are kept even if others fail
- `BRIAN_INGEST_TOKEN` is set on the Brian server (32+ characters) and shared with the feed owner. It is separate from user logins

**2. Drop files (simplest for batches)**

Put `.jsonl` files in `data/inbox/` on the Brian server. The next sweep imports them and moves them to `data/inbox/processed/`.

## What Brian does with it

- Records appear as sources named `ext:<source>` (e.g. `ext:x`) in Live, Trends and evidence lists
- Records with a `series` are staged by the lifecycle model like any other trend
- Records without a series are clustered with news into Live moments and ranked by talkability; more independent sources on one story ranks it higher
- Every agent can cite the record's `url`; nothing else from the record is treated as fact unless it's in the text

## Notes for feed owners

- Send what you're permitted to share under each platform's terms
- Don't include personal data Brian doesn't need (private messages, phone numbers, emails). Public posts, public channels and aggregate counts are what it uses
- Prefer one record per post or message; Brian does the clustering
