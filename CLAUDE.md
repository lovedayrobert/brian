# Guide for AI assistants reviewing Brian

Brian is Cashy's AI marketing engine (Next.js 16, TypeScript, Anthropic SDK). If you've been asked to review or explain it, start here.

## Read first

1. `docs/01-overview.md`: what it does and its current state
2. `docs/02-architecture.md`: code layout, data model, request flows
3. `docs/03-agents-and-pipelines.md`: every agent and pipeline
4. `docs/04-sources-and-accuracy.md`: sources, ranking, accuracy enforcement, lifecycle model and backtest
5. `docs/05-memory.md`: learning from feedback
6. `docs/06-operations.md`: setup, login, spend cap, costs, known limits, roadmap
7. `docs/07-data-import.md`: format for partner data feeds
8. `docs/08-team-tool-setup.md`: calendar, Linear, CRM sheet, Google sign-in, model setup
9. `docs/09-roadmap.md`: what comes next

## Product rule: Brian first, everything one click away

Brian is the home screen (`/`): a brain the team teaches, which then thinks for them. Every other area is one click away in a single slim top bar (Brian, Today, Ideas, Calendar, Results, Radar, Settings) in the app's own soft light style (Rob tried a Bittensor look on 22 Oct and asked to go back). Rob and Marko asked for this middle ground on 22 Oct 2026, after the old sidebar dashboard felt overcomplicated and a Brian-only screen hid the tools the team uses.

**Never add an item to the top bar or a new top-level page**, and never put anything on Brian's screen that isn't teaching him, his brain, or his ideas. A new feature goes inside one of the spaces: as a tab (`src/components/section-tabs.tsx`), a panel, a section or a button on an existing page. If a feature doesn't clearly belong in one space, that's a sign it isn't needed yet. Ask before building it. Old URLs are redirected in `next.config.ts`; keep them working when moving things.

Before adding anything, check it can be used without explanation by someone on the marketing team who has never seen Brian, and that an existing feature doesn't already do the job.

## Where the important code is

| Concern | File |
|---|---|
| Data model | `src/lib/domain/types.ts` |
| Agent config, model calls, cost logging | `src/lib/adapters/model/index.ts` |
| Idea pipeline (Inventor, Critic, Red Lines, Prior Art) | `src/lib/pipeline/ideas.ts` |
| Campaign package pipeline | `src/lib/pipeline/develop.ts`, `src/lib/pipeline/package-schemas.ts` |
| Discovery sweep and ranking | `src/lib/pipeline/sweep.ts` |
| Pure maths (tested) | `src/lib/engine/` |
| Data sources | `src/lib/adapters/sources/` |
| Memory | `src/lib/memory.ts` |
| Brand book, quality bar, Lab lenses | `src/lib/brand/` |

## Verify claims yourself

```bash
npm install
npm test            # 119 unit tests
npm run typecheck
npm run lint
npm run build
```

## Honest status

- Discovery runs on live data from free sources. The AI agents have been run end to end against the API (ideas, Lab, a full 11-section package); they need `ANTHROPIC_API_KEY`.
- The lifecycle forecaster's backtest is reported as is: 74% of launch-window calls right versus 77% for naive momentum on the same data.
- Storage is a local JSON file; the Postgres schema for the hosted build is in `supabase/migrations/`.
- The sample package loaded by `npm run demo` is hand-written to show the format and is labelled as such in the app.

## Conventions for anyone changing the code

- Next.js 16 has breaking changes from older versions; read `node_modules/next/dist/docs/` before changing framework code (see `AGENTS.md`).
- Anything that produces a number belongs in `src/lib/engine/` with a test.
- Every external service sits behind an adapter; missing keys must switch features off, not break the app.
- Never let a model write a URL that isn't in the evidence; never let a model do arithmetic.
