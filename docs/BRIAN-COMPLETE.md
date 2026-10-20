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
| **Invent** | From a trend, a breaking story, a calendar day, the team's own spark, or a type of idea (aim at the villain, too far, be everywhere, wrong place, deal with a twist, main character, rival raid, laugh at the fall). Each idea is one real act aimed at a feeling the audience already has. Each run drafts ten; a five-person audience panel kills most; survivors pass Red Lines. |
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
| Visuals | Art Director gives every asset its own format; images, storyboard frames and teaser clips via fal.ai, tested end to end |
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

**Sweep** (`POST /api/sweep` starts one in the background and `GET /api/sweep` reports progress; or `npm run sweep`)

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

### Two kinds of idea

| | Quick reactions | Big ideas |
|---|---|---|
| What | Ride a story or spike while it's hot | Durable brand plays, or ideas built around big moments people anticipate for weeks (GTA 6, a World Cup, holidays) |
| Shelf life | 24–48 hours | Months, or the whole run-up to the moment |
| Must be | Live the same day, under about $2k, no builds | Simple, original, and not done by any crypto gambling competitor |
| Extra Critic test | Speed test | Staying-power test |
| Develop | Quick Pack: post-ready copy, native visuals, risk check | Full 11-section campaign package |
| Default source | Breaking stories, trend spikes, the *Hijack what's happening* lens | Calendar moments and every other Lab lens |

Trends and calendar moments offer both: "Quick reactions" or "Big ideas". Each idea records its horizon, effort and shelf life.

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


## Idea size, spread and reality (21 Oct 2026)

After Rob's review of the first engine-4 run:
- **Right size.** Every idea says how big it is: reply, post, meme, real act or campaign. At least 6 of 10 should be a reply, post or meme with the exact words written out. A small joke inflated into a deal or campaign is an automatic kill.
- **Spread.** At most 2 ideas per subject reach the panel, at most 1 per subject in the final three, and ideas should span different worlds (streaming, sport, crypto, gaming, internet culture, news).
- **Reality.** "What Cashy can actually do" (Settings → Brand, admins edit) is part of every run. Ideas that need a famous person or another brand to cooperate or reply die. Villains must be people most of the audience genuinely dislikes.
- **Writing.** `src/lib/brand/style.ts` lists AI writing habits ("ship", "it's not X, it's Y", "diabolical", em dashes, forced slang). They're banned in the prompts and any idea containing them is killed in code.
- **Budget.** An idea run only starts if its worst case (about $2.70) fits under every cap, so money is never spent on a run the cap would stop halfway.

## Learning from examples, not copying them (21 Oct 2026)

Rob's examples (Shuffle and Jack Doherty, Duel, Stake's logo, the kitchen-store fridge, the GTA map in LA) are there for Brian to learn why they worked, not to copy. So:
- The Inventor works from **principles** distilled from them (`PRINCIPLES` in `src/lib/brand/quality-bar.ts`): the feeling already exists; two worlds that never meet; real beats staged; ride attention that's already flowing; one sentence the brand can't be dropped from; cheap and on time; love-hate spreads; people share to say something about themselves.
- The examples appear only as **already done**, with "learn why, never reuse its concept, object, format or target".
- A **code check** (`copiesExample`) kills ideas that reuse an example's signature (appliances, logos on viral videos, paying someone to stop posting, game maps in real streets…).
- Ideas are no longer forced into template types named after the examples; the "Get ideas" types are written as principles.


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

## Sending a blind review to someone running their own Brian

1. Owner: `npm run review -- export` writes `brian-review-<id>.json.gz` (the frozen cards, packages and every generated image). Send the file.
2. Reviewer: `npm install`, then `npm run review -- import <file>`, then `npm run dev` and open the `/review/<id>` link it prints. No API keys are needed to rate.
3. Reviewer: when done, `npm run review -- results` writes `brian-review-results-<id>.json`. Send it back.
4. Owner: `npm run review -- import-ratings <file>`. Verdicts appear on the review page and feed Memory; importing twice doesn't double count.

Imported items are kept off Ideas, Today, Packages and Mockups so scores stay hidden until everything is rated. The scores are still inside the file, so on someone else's machine the blindness relies on trust.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run sweep` | Full discovery sweep |
| `npm run backtest` | Lifecycle backtest; caches series in `.data/backtest-series.json` |
| `npm run demo` / `npm run demo -- --remove` | Load or remove the sample package |
| `npm run eval` | Generate the blind review set (needs the AI key) |
| `npm run review -- export/import/results/import-ratings` | Move a blind review between Brian installs |
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

Put `.jsonl` files in the `inbox` folder inside Brian's data directory (`.data/inbox/` locally, or `$BRIAN_DATA_DIR/inbox/` on a server). The next sweep imports them and moves them to `inbox/processed/`.

## What Brian does with it

- Records appear as sources named `ext:<source>` (e.g. `ext:x`) in Live, Trends and evidence lists
- Records with a `series` are staged by the lifecycle model like any other trend
- Records without a series are clustered with news into Live moments and ranked by talkability; more independent sources on one story ranks it higher
- Every agent can cite the record's `url`; nothing else from the record is treated as fact unless it's in the text

## Notes for feed owners

- Send what you're permitted to share under each platform's terms
- Don't include personal data Brian doesn't need (private messages, phone numbers, emails). Public posts, public channels and aggregate counts are what it uses
- Prefer one record per post or message; Brian does the clustering


---

# 8. Team tool: calendar, Linear, CRM sheet, Google sign-in, model setup

Everything below is built and switched on by setting variables in Railway (or `.env.local` locally). Nothing needs code changes.

## How the app is organised

Four spaces plus Settings, and nothing else in the sidebar (see the product rule in `CLAUDE.md`):

- **Home**: what to do today: due and overdue tasks, ideas waiting, the room in three lines, special days coming up.
- **Radar**: what's happening: The room (Pulse), Breaking, Trends, Rivals.
- **Ideas**: Brian's ideas, Get ideas, Inspiration. Packages and mockups open from their idea.
- **Calendar**: Linear tasks, the CRM sheet, special days, ideas for any day.
- **Settings**: coverage and cost, sources, brand, models, what Brian has learned, accuracy, results.

## Working together

- **Accounts:** everyone signs in with their BitStarz Google account (or a password until Google is set up). Brian matches each person to their Linear account by email.
- **Who did what:** ideas show who asked for them and from what spark or post; tasks show who created them in Brian; Memory shows who taught each rule; Settings → Team shows each person's AI spend this month.
- **Reactions** 🔥 👍 👎 😂 on ideas and Inspiration posts. *To review* sorts by the team's reactions (🔥 counts double, 👎 counts against), and 🔥 / 👍 / 👎 also count as feedback Brian learns from.
- **Comments** with @mentions on ideas, Inspiration posts and calendar tasks. On Linear tasks the comment goes onto the Linear issue (signed "Name (via Brian)", because Brian posts with one Linear key). Mentions show under *For you* on the person's Home.
- **Your view:** Home has *Mine / Team*; the calendar has *Mine*. Calendar filters and display settings are saved to your account and follow you across devices.
- **Team activity:** *What the team did* on Home: ideas made and approved, comments, reactions, calendar changes, rules taught.
- **Roles:** everyone can react, comment, get ideas, approve and plan. Only admins (`BRIAN_ADMINS`, comma-separated emails or login names; default `rob,marko,rob.loveday@bitstarz.com`) can teach or edit Memory and import reviews. Add Marko's Google email to `BRIAN_ADMINS` once he signs in with Google.

## Marketing calendar (`/calendar`)

- **Views:** month, week, agenda, board (by status). Keyboard: `t` today, `←/→` move, `c` new task, `/` search, `m w a b` views, `u` tasks with no date, `Esc` closes.
- **Tasks:** create from any day (double-click, the `+`, or *New task*), with every field: title, description, due date, status, team, assignee, priority, project, estimate, labels, channel and type. Drag a card to another day to reschedule it; drag on the board to change status; drag from the *No due date* tray to schedule it.
- **Filters:** team, project, label, status, assignee, channel, source (Linear, Brian, CRM sheet), special-day type, and *CRM needing social*. Filters and display settings are remembered per person.
- **Special days** are filled in automatically: holidays, crypto anniversaries (Bitcoin Pizza Day, Genesis Block, whitepaper day…), internet and gaming days, Black Friday, Friday the 13ths, Super Bowl, Kentucky Derby, GTA 6. Add more in `src/lib/calendar/days.ts`.
- **Brian inside the calendar:** open any day for *Post ideas* (three ideas, about $0.10), *A bigger move* (the full engine, about $0.75) or *Plan it myself*. Every idea has *Add as task*, which opens the editor filled in. On any idea page, *Add to calendar* does the same.

## Results (Calendar → Results)

- **Published:** on any calendar task, paste the link to each post once it's out. Brian reads X and Telegram posts by itself (YouTube too with `YOUTUBE_API_KEY`) when added and again at about 1 hour, 24 hours and 7 days, and every day for the first month. Instagram, TikTok and Discord numbers are entered on the task until their access is connected. On Linear tasks the post link is also attached to the issue.
- **Our channels:** `BRIAN_CHANNELS` (default `telegram:playcashy,x:playcashy`). Brian records followers twice a day, and picks up every Telegram channel post by itself (views at 1 hour, 24 hours, 7 days), so nobody pastes those. X posts still need their link pasted until an X feed is connected.
- **Tracking links:** every task has a campaign name and a link per channel (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`). Use those links in posts, newsletters and creator briefs so GA4 can tie visits and sign-ups to the task. The default destination is `https://cashy.com` (`NEXT_PUBLIC_BRIAN_DEFAULT_LINK` changes it).
- **Results tab:** posts tracked, views, engagements, website visits and key events from them; top posts; a table by task and idea with Brian's prediction alongside; what works by channel, type of idea and day (once there are 3+ posts per group); and the website from GA4: sessions, users, key events, top sources, every campaign, top blog pages.

**AI budget.** `BRIAN_BUDGET_USD` from `BRIAN_BUDGET_SINCE` (YYYY-MM-DD) is a hard total: no AI call runs if it would pass it, on top of `BRIAN_DAILY_CAP_USD`. The sidebar shows what's left. Local copies of Brian keep their own ledger, so give them a separate small budget and keep the two under the credit you bought.

**X as a Radar source (the important part)**
- **Free:** X trending topics every hour (US, UK, worldwide; `X_TREND_REGIONS`) from trends24.in, the strongest 40 per country (`X_TRENDS_PER_REGION`), each with an hourly curve so the lifecycle model stages it. They appear in Trends and feed the Pulse.
- **Paid, on a strict budget, topics first:** with `X_BEARER_TOKEN`, each pull (every `X_PULL_HOURS`, default 12) reads the most engaged posts, from anyone, on: (1) what's hot right now: the Pulse's villain, main character and top subjects, then the strongest X trends; (2) one standing topic group in rotation (`X_WATCH_TOPICS`, default `streamers:Adin Ross,xQc,Kai Cenat,IShowSpeed,Trainwreck|streaming drama:Kick streamer,Twitch ban,banned on stream|degen betting:parlay,bad beat,slot stream|crypto culture:memecoin,rug pull,rugged|gaming:GTA 6,GTA VI`); (3) two accounts that post about things, in rotation (`X_WATCHLISTS`, default `drama:DramaAlert,Dexerto,FearedBuck,JakeSucky,StreamerBans|crypto:WatcherGuru,zachxbt,lookonchain|sports:BleacherReport,barstoolsports,ActionNetworkHQ|viral:NoContextHumans,knowyourmeme,DailyLoud`). People are topics, not accounts: what's said about them matters, not their own posts. Rivals: what people say to and about them (`X_RIVALS`), every `X_RIVALS_EVERY_DAYS` (default 3). Posts with almost no engagement (under `X_MIN_LIKES`, default 20, and under 5,000 views) are dropped. Anniversary filler is excluded in the query.
- **Budget:** `X_MONTHLY_BUDGET_USD` (default $9) is split evenly across the days of the month and each read is counted at `X_PRICE_PER_POST` (default $0.005), so a day can't spend more than its share (about $0.29). Set a matching spending limit in X's developer portal too.
- Our own @PlayCashy posts through the API are off (`X_TRACK_OWN=1` turns them on); pasted links on tasks are read free.

**Connecting X (our own account only)**
1. Signed in as @PlayCashy, go to developer.x.com → sign up for a developer account → create a Project and an App.
2. In the app's settings → User authentication settings: **Read** only (Brian never posts).
3. Keys and tokens: copy the **API Key and Secret**, and generate the **Access Token and Secret** for @PlayCashy.
4. In the developer portal, add credit and **set a monthly spending limit** (e.g. $10).
5. In Railway set `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`. Optional `X_MAX_READS_PER_MONTH` (default 1,000 post reads: at most $5 a month at X's standard rate).

Brian then reads @PlayCashy's latest 20 posts once a day (about 600 reads a month), with impressions and link clicks for posts under 30 days old, and adds them to Results automatically.

**Connecting GA4**
1. Google Cloud console → create (or pick) a project → APIs & Services → Library → enable **Google Analytics Data API**.
2. IAM & Admin → Service accounts → create one called `brian-reader` (no roles) → Keys → Add key → JSON. If your Workspace blocks key creation, IT needs to allow it for this project.
3. In GA4: Admin → Property access management → add the service account's email as **Viewer**.
4. GA4 Admin → Property details: copy the **Property ID** (a number).
5. In Railway set `GOOGLE_SERVICE_ACCOUNT_JSON` (paste the whole key file) and `GA4_PROPERTY_ID`. `GA4_BLOG_PATH` defaults to `/articles`.
6. In GA4 make sure sign-ups (and first deposits, if tracked) are marked as **key events**, so "key events" in Brian means sign-ups.

The same service account can also read the CRM sheet privately and, later, Search Console.

## Linear

| Variable | What |
|---|---|
| `LINEAR_API_KEY` | Linear → Settings → Security & access → Personal API keys. Brian acts as the person whose key it is. |
| `LINEAR_TEAM` | Default team for new tasks, by key, e.g. `SMCA` |

With the key set, every task created or edited in the calendar is a real Linear issue, and Linear issues with a due date (all teams, filterable) show in the calendar. Archive in Brian archives in Linear. Brian keeps only what Linear has no field for: the channel and the idea or special day a task came from. Without the key, tasks are saved in Brian with the same fields.

## CRM calendar (Google Sheet)

Connected: `CRM_SHEET_ID` is the CRM calendar sheet. Brian reads the month tabs (e.g. `OCTOBER 2026`) from last month to three months ahead, every 30 minutes, and never writes to the sheet.

- **Only rows ticked in the `SM` column come in.** Those are the CRM sends that need social media input. They show in the calendar with an orange outline, and stay visible whatever Linear filters you use. Set `CRM_SHEET_ALL_ROWS=1` to bring in every row instead.
- Rows without a date belong to the date above (as in the sheet). A ticked row with no name shows as "Untitled CRM send" so it gets named in the sheet.
- Each item carries the description, game, segment and which channels are ticked (NL, Onsite, Push, Blog, AFF, SM).
- Today Brian reads the sheet through its "anyone with the link can view" sharing. To lock it down, create a Google service account, share the sheet with it (Viewer), set `GOOGLE_SERVICE_ACCOUNT_JSON`, then switch off link sharing.
- Other layouts: `CRM_SHEET_COLUMNS` maps headers (e.g. `date=Send date,title=Campaign name,social=Social`), `CRM_SHEET_TAB` reads one tab, `CRM_SHEET_CSV_URL` reads a single published CSV.

## Google sign-in (BitStarz accounts only)

1. Google Cloud console → APIs & Services → Credentials → *Create OAuth client ID* → Web application. Set the consent screen to *Internal* (Workspace) so only BitStarz accounts can even see it.
2. Authorised redirect URI: `https://brian-production.up.railway.app/api/auth/google/callback` (and `http://localhost:3000/api/auth/google/callback` for local).
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `BRIAN_PUBLIC_URL=https://brian-production.up.railway.app`.
4. Optional: `BRIAN_ALLOWED_DOMAINS` (default `bitstarz.com`; comma-separate several).

Only verified Google accounts whose email **and** Workspace domain are on the list get in, so personal Gmail is refused. Once Google is set, passwords stop working unless `BRIAN_ALLOW_PASSWORDS=1`.

## Model setup

| Mode | Invents | Judges (audience panel) | Typical cost per idea run | Worst case the cap reserves |
|---|---|---|---|---|
| Default | Opus 5.5 | Opus 5.5 | about $0.65 | about $2.70 |
| `BRIAN_QUALITY=max` (on) | Fable 5.1 **and** GPT-6 Astra, in parallel, 10 ideas each | Opus 5.5, all 20 together | about $2 | about $4.60 |

- Each idea shows which model invented it ("by Fable", "by GPT-6 Astra"), so the team can see which one earns its keep.
- Astra needs `OPENAI_API_KEY`; `BRIAN_CHECKER_MODEL` overrides the model (default `gpt-6-astra`), priced for the cap at `OPENAI_PRICE_IN` / `OPENAI_PRICE_OUT` (default $10 / $50 per million tokens). If one inventor fails, the run continues with the other.
- With a $5 daily cap, the live site can start one max-quality run a day.
- Marko's original planner (Fable picks angles, Astra checks the plan) and Astra's second opinion are still in the code, switched off: `BRIAN_PLANNER=1`, `BRIAN_SECOND_OPINION=1`.
- Any single agent can be pointed at another model with `BRIAN_MODEL_<AGENT>`.

## Inspiration (`/ideas/inspiration`)

Paste any post the team finds clever and say why. Brian reads the latest 15 every time it invents, to learn the team's taste. *Riff on this* starts ideas from one. *Get ideas → Start from your own idea* takes a half-idea or "they did this, could we do something like it?".


---

# 9. Roadmap: making Brian the marketing team's daily tool

Built so far: discovery (Live, Pulse, Trends), idea engine 4 with the audience panel, the swipe file and sparks, campaign packages with visuals, the marketing calendar on Linear, the CRM sheet, Google sign-in.

## Next, in rough order of value

1. **Daily brief in Slack.** Each morning: the room in three lines (from the Pulse), today's and tomorrow's special days with one idea each, what's due, and what's overdue in Linear. One click to open the day in Brian.
2. **Approval flow.** Draft → review → approved → scheduled, with who approved what. Comments on tasks synced to Linear comments. Legal or compliance sign-off as a step for anything flagged by Red Lines.
3. **Content library on each task.** Upload or generate the asset (image, video, copy variants) on the task itself, with versions. Brian's mockups attach automatically when an idea becomes a task.
4. **Publishing hand-off.** Export a scheduled post to the scheduler the team uses (Buffer, Hootsuite, Typefully for X) with copy and asset, without Brian ever posting by itself.
5. **Results back on the calendar.** After a post goes out, pull its views, likes and reposts (X, TikTok, YouTube) onto the task, and feed what worked into Brian's Memory so ideas get better.
6. **Campaign timelines.** Group tasks into a campaign (a Linear project) and see it as a timeline with phases and dependencies; Brian's packages become a campaign in one click.
7. **Competitor watch on the calendar.** When Stake, Shuffle, Rollbit and co. run something, it appears as a marker on the day it happened, with a link, so the team sees the landscape next to its own plan.
8. **Capacity view.** Who has what this week, by person and channel; warns when a day is overloaded or a channel has gone quiet.
9. **Recurring slots.** "Every Friday: degen meme", "first Monday: CRM newsletter", created as Linear issues automatically.
10. **Brief generator.** From any task: a one-page brief for a designer, editor or creator (goal, hook, references from the swipe file, deliverables, deadline), sent to Linear or Slack.
11. **Creator CRM.** Streamers, clippers and meme pages the team works with: rates, contact, past results, and which ideas suit them.
12. **Swipe file from anywhere.** A browser button and a Slack shortcut to drop a link into the swipe file without opening Brian.
13. **Market and timezone awareness.** Mark which markets each task targets, show local posting times, and flag when a special day isn't relevant in a market.
14. **Spend and budget per campaign.** Track paid amounts (creators, ads, production) against the plan, next to AI spend.

## Housekeeping

- Run on Marko's Max or Team plan credits (an API key from that Console organisation) instead of a personal key.
- Rotate the API keys pasted in chat earlier.
- Move from the JSON file to Postgres (schema already in `supabase/migrations/`) once more than a handful of people use Brian daily.

