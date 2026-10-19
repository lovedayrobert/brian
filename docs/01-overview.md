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
