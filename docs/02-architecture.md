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
