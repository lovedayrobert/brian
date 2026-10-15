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
