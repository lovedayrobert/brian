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
| `ANTHROPIC_API_KEY` | All agents: ideas, Lab, Critic, Red Lines, Prior Art, packages, Rapid Response, Cartographer, memory consolidation |
| `OPENAI_API_KEY`, `IMAGE_MODEL` | Generated key visuals (default model `gpt-image-1`) |
| `YOUTUBE_API_KEY` | YouTube trending |
| `LINEAR_API_KEY`, `LINEAR_TEAM_ID` | Push to Linear |
| `SLACK_WEBHOOK_URL` | Alerts and daily summary (planned) |
| X, Reddit, Twitch, Kick, Telegram, Dune, Arkham, SerpApi, Firecrawl, Exa, Apify keys | Reserved for their adapters |

Secrets live only in `.env.local`, which is git-ignored. `.data/` (local database) and `public/generated/` (images) are also ignored.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run sweep` | Full discovery sweep |
| `npm run backtest` | Lifecycle backtest; caches series in `.data/backtest-series.json` |
| `npm run demo` / `npm run demo -- --remove` | Load or remove the sample package |
| `npm test` | Unit tests (41) |
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

- The AI pipelines are built and type-checked but have not yet been run end to end against the API.
- Storage is a local file and long jobs run in the web process; production needs Postgres and a job queue.
- GDELT throttles by IP; the sweep carries over its last good data.
- Without the AI key, relevance and coin classification are keyword heuristics and are labelled as such; coin links to moments are switched off until the model has read the coins.
- The lifecycle model does not yet beat naive momentum (doc 4).
- Brand visual identity is a placeholder until Cashy's logo, fonts and colours are supplied.
- No authentication: run locally or behind access control.

## Roadmap

| Phase | Scope |
|---|---|
| Now | Connect the Anthropic key; run ideas, Lab and packages end to end; tune prompts on real output |
| Next | X adapter; real brand assets; Postgres and job queue; hosted deployment with auth; scheduled sweeps and Slack summary |
| Then | Reddit, Kick, TikTok via vendor; competitor tracking; creator shortlists from live data; video storyboards; Figma export; comments and versions UI; BitStarz |
| Later | Analytics integration, live campaign dashboards, forecast versus actual, recalibration of the forecaster |
