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
