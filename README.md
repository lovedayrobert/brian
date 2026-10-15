# Brian

Cashy's marketing brain. Brian watches what the internet is talking about, works out what's still rising, invents ideas only Cashy could run, and develops the one you pick into a complete campaign package with a fully briefed Linear project.

Full documentation is in [docs/](docs/01-overview.md) (or [one combined file](docs/BRIAN-COMPLETE.md)). AI assistants reviewing the code should start with [CLAUDE.md](CLAUDE.md).

## Run it

```bash
npm install
cp .env.example .env.local   # add keys as you get them; all optional
npm run sweep                # pull live signals (about 1–3 minutes)
npm run backtest             # score the lifecycle forecaster on history
npm run demo                 # load a labelled sample package (remove: npm run demo -- --remove)
npm run dev                  # http://localhost:3000
```

## What works today, and what needs a key

| | Without any keys | With `ANTHROPIC_API_KEY` |
|---|---|---|
| Live sweep: Google trending searches, culture, crypto and iGaming press, Wikipedia attention curves, GDELT news, Polymarket | ✅ | ✅ |
| Lifecycle staging, sensitivity filter, launch window, calendar | ✅ (keyword relevance, labelled heuristic) | ✅ (Haiku relevance with reasons) |
| Lifecycle backtest on 120 days of history | ✅ | ✅ |
| Coverage & cost planner (Settings) | ✅ | ✅ |
| Ideas from trends: Inventor → Critic → Red Lines → Prior Art (web search) | – | ✅ |
| Opportunity Lab: original ideas through eight lenses (advantages, product as media, rival weak spots, open channels, crypto-native, deals, calendar, blank page) | – | ✅ |
| Memecoin research: active pump.fun coins (GeckoTerminal, DexScreener) | ✅ (listed, unverified) | ✅ (culture coins identified and linked to moments) |
| Rapid Response: three takes, then post-ready assets | – | ✅ |
| Develop: full package in 11 sections, live progress, steering with cascade | – | ✅ |
| Mockups: X, Instagram feed/carousel/story, TikTok, landing page (desktop and mobile), Telegram, Discord | – | ✅ (code-built visuals; add `OPENAI_API_KEY` for generated key visuals) |
| Memory: verdicts, Critic overrules, repeated steering and taught rules feed every agent; timeline of what Brian learned and used | ✅ (stores and applies everything) | ✅ (also finds patterns across feedback) |
| Push to Linear | – | add `LINEAR_API_KEY` + `LINEAR_TEAM_ID` |

Free extras worth adding now: `YOUTUBE_API_KEY` (trending gaming and entertainment video).

## Demo script for Marko (about 10 minutes)

1. **Today.** "This is what Brian found this morning, from free sources only." Point at the launch window and the calendar.
2. **A trend.** Open one. The curve, the lifecycle call and why, and the evidence from multiple outlets.
3. **Live → React.** Pick a breaking moment and press React. Three takes in under a minute, each red-line checked.
4. **An idea card → Develop.** Open a package built before the meeting (runs take 3–6 minutes): executive summary, strategy, mockups in real platform frames, business case. Edit a number in the business case and watch it recalculate. Type "cut the budget in half" into the steering bar.
5. **Settings → Accuracy.** Show the honest backtest: where the forecaster is good, and where it isn't yet.
6. **Settings → Coverage & cost.** The ask. Lean, Standard or Full; radar is fixed monthly, campaign builds are pay per use.

Before the meeting: run `npm run sweep` the same morning so the moments are fresh, and develop two or three ideas in advance.

## How it's built

```
src/
  app/                    Screens (Live, Today, Trends, Ideas, Packages, Mockups, Campaigns,
                          Competitors, Results, Settings) and API routes
  components/             Design system, platform mockup frames, package section views
  lib/
    domain/types.ts       The data model: every claim carries citations, every number its provenance
    engine/               Pure, tested maths: lifecycle, backtest, funnel, budget, safety filter
    adapters/
      sources/            One file per data source behind a common interface
      model/              Single entry point for Claude: per-agent model config, cost and latency log,
                          refusal fallbacks, web research
      image/              Key visual generation (OpenAI today; swap by adding a branch)
      tasks/linear.ts     Linear project and issue creation
    pipeline/             Sweep, Cartographer, ideas, Develop (with steering cascade), Rapid Response
    brand/                Brand books, advantages, quality bar, stunt library, culture calendar
    config/sources.ts     Source catalogue with access status, terms notes and cost estimates
    store/                Repository interface; local JSON file for the prototype
supabase/migrations/      Postgres + pgvector schema for the hosted build
```

**Adding a data source:** write `src/lib/adapters/sources/<name>.ts` implementing `SourceAdapter`, add it to `registry.ts`, and put its keys in `.env.local`. The catalogue entry in `config/sources.ts` already exists for every source in the brief.

**Accuracy rules are enforced in code, not prompts.** Any URL a model writes that isn't in Brian's evidence is replaced with null and shown as "unsourced". Funnel maths is never done by a model. A number labelled "measured" without our own data is relabelled "assumption".

## Known limits of the prototype

- Storage is a local JSON file and long jobs run in the web process. The hosted build moves these to Supabase and a job queue (Trigger.dev). The schema is in `supabase/`.
- GDELT throttles by IP. When it does, the sweep keeps the last good GDELT data and says so in Settings → Sources.
- Brand visual identity is a placeholder until Cashy's logo files, fonts and colours are supplied.
- The lifecycle forecaster does not yet beat simple momentum on free attention data (see Settings → Accuracy).
- BitStarz, video generation, Figma export, comments and the daily Slack summary are later phases.

## Tests

```bash
npm test          # lifecycle, backtest, funnel, budget allocation, costs, safety filter
npm run typecheck
```
