import type { SourceCategory } from "@/lib/domain/types";

/**
 * The source catalogue. One entry per data source in the brief (section 3a).
 * Costs are estimates, labelled as such in the UI. `access` records whether a
 * source can be used legitimately and what it takes.
 */
export type Access = "free" | "free-key" | "paid" | "agreement" | "restricted";

export interface SourceDef {
  id: string;
  name: string;
  category: SourceCategory;
  access: Access;
  /** Implemented adapter that can run today without spend */
  liveAdapter: boolean;
  envKeys: string[];
  monthlyCost: { low: number; high: number };
  costNote: string;
  unlocks: string;
  termsNote?: string;
  phase: 1 | 2 | 3 | 4;
}

export const SOURCES: SourceDef[] = [
  // ----- Live today, no spend -----
  {
    id: "wikipedia",
    name: "Wikipedia pageviews",
    category: "search",
    access: "free",
    liveAdapter: true,
    envKeys: [],
    monthlyCost: { low: 0, high: 0 },
    costNote: "Free Wikimedia REST API",
    unlocks: "Supporting data, not an idea source. Gives a 30-day daily attention curve for almost any topic, which is how Brian stages lifecycles and backtests the forecaster.",
    phase: 1,
  },
  {
    id: "gdelt",
    name: "GDELT global news",
    category: "news",
    access: "free",
    liveAdapter: true,
    envKeys: [],
    monthlyCost: { low: 0, high: 0 },
    costNote: "Free",
    unlocks: "Breaking news volume across 100+ languages, with article-level evidence and daily volume timelines.",
    phase: 1,
  },
  {
    id: "polymarket",
    name: "Polymarket",
    category: "markets",
    access: "free",
    liveAdapter: true,
    envKeys: [],
    monthlyCost: { low: 0, high: 0 },
    costNote: "Free public API",
    unlocks: "Supporting context only. Occasionally shows an event crypto-native people are betting heavily on, and adds dated moments to the calendar.",
    phase: 1,
  },
  {
    id: "press",
    name: "Industry and crypto press (RSS)",
    category: "industry",
    access: "free",
    liveAdapter: true,
    envKeys: [],
    monthlyCost: { low: 0, high: 0 },
    costNote: "Free RSS feeds",
    unlocks: "iGaming and crypto news, competitor launches and regulation, as it is published.",
    phase: 1,
  },
  {
    id: "trenches",
    name: "The trenches (pump.fun)",
    category: "onchain",
    access: "free",
    liveAdapter: true,
    envKeys: [],
    monthlyCost: { low: 0, high: 0 },
    costNote: "Free: GeckoTerminal and DexScreener public APIs",
    unlocks: "The pump.fun coins getting the most real trading right now. Memecoin launchers name coins after whatever is catching, often within minutes, so this is one of the earliest free signals of a meme or moment taking off.",
    termsNote: "Volume is easy to fake and most coins collapse within hours. Brian uses coins as a culture signal and never promotes one.",
    phase: 1,
  },
  {
    id: "youtube",
    name: "YouTube Data API",
    category: "video",
    access: "free-key",
    liveAdapter: true,
    envKeys: ["YOUTUBE_API_KEY"],
    monthlyCost: { low: 0, high: 0 },
    costNote: "Free within 10,000 units/day",
    unlocks: "Trending videos and Shorts in gaming, crypto and entertainment, with view velocity.",
    phase: 1,
  },
  {
    id: "twitch",
    name: "Twitch Helix",
    category: "streaming",
    access: "free-key",
    liveAdapter: true,
    envKeys: ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET"],
    monthlyCost: { low: 0, high: 0 },
    costNote: "Free with an app registration",
    unlocks: "Top streams and categories, viewer spikes, which streamers are breaking out.",
    phase: 3,
  },
  {
    id: "telegram",
    name: "Telegram public channels",
    category: "social",
    access: "free-key",
    liveAdapter: false,
    envKeys: ["TELEGRAM_API_ID", "TELEGRAM_API_HASH"],
    monthlyCost: { low: 0, high: 0 },
    costNote: "Free via official client API",
    unlocks: "Casino and crypto community chatter, alpha calls and competitor announcements.",
    phase: 3,
  },
  {
    id: "etherscan",
    name: "Etherscan",
    category: "onchain",
    access: "free-key",
    liveAdapter: false,
    envKeys: ["ETHERSCAN_API_KEY"],
    monthlyCost: { low: 0, high: 199 },
    costNote: "Free tier; Pro if volume grows",
    unlocks: "On-chain flows into known casino wallets.",
    phase: 3,
  },

  // ----- Needs budget -----
  {
    id: "x",
    name: "X (Twitter) API",
    category: "social",
    access: "paid",
    liveAdapter: false,
    envKeys: ["X_BEARER_TOKEN"],
    monthlyCost: { low: 200, high: 5000 },
    costNote: "Basic ≈ $200/mo (limited search); Pro ≈ $5,000/mo for real velocity tracking. Confirm current pricing.",
    unlocks: "Real-time velocity on crypto, gambling and meme circles. The single most important source for breaking moments and Rapid Response.",
    termsNote: "Third-party X data resellers are cheaper but breach X's terms.",
    phase: 1,
  },
  {
    id: "reddit",
    name: "Reddit Data API",
    category: "social",
    access: "agreement",
    liveAdapter: false,
    envKeys: ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"],
    monthlyCost: { low: 0, high: 1000 },
    costNote: "Commercial use needs a Reddit data agreement; pricing on application.",
    unlocks: "Rising posts in gambling, crypto and meme communities: where memes are born before they hit X.",
    phase: 1,
  },
  {
    id: "googletrends",
    name: "Google Trends",
    category: "search",
    access: "free",
    liveAdapter: true,
    envKeys: [],
    monthlyCost: { low: 0, high: 150 },
    costNote: "Trending-now feed is free and live. Breakout queries and history need the official API (limited alpha) or SerpApi (≈ $75–150/mo).",
    unlocks: "What people are searching right now in the US, UK, Canada and Australia, with the news behind each spike. Upgrade adds breakout queries and history by market.",
    termsNote: "SerpApi scrapes Google; grey under Google's terms. Official API preferred once granted.",
    phase: 1,
  },
  {
    id: "newsapi",
    name: "News API (commercial)",
    category: "news",
    access: "paid",
    liveAdapter: false,
    envKeys: ["NEWS_API_KEY"],
    monthlyCost: { low: 0, high: 449 },
    costNote: "GDELT covers most needs; a commercial feed adds speed and cleaner headlines.",
    unlocks: "Minute-level breaking headlines from major outlets.",
    phase: 2,
  },
  {
    id: "tiktok",
    name: "TikTok trends",
    category: "video",
    access: "restricted",
    liveAdapter: false,
    envKeys: ["SOCIAL_LISTENING_KEY"],
    monthlyCost: { low: 1000, high: 5000 },
    costNote: "No commercial trends API. Licensed social-listening vendor needed.",
    unlocks: "Trending sounds and formats, the fastest meme lifecycle on the internet.",
    termsNote: "Scraping Creative Center via Apify breaches TikTok's terms.",
    phase: 3,
  },
  {
    id: "instagram",
    name: "Instagram Reels",
    category: "video",
    access: "restricted",
    liveAdapter: false,
    envKeys: ["META_ACCESS_TOKEN"],
    monthlyCost: { low: 0, high: 0 },
    costNote: "Graph API hashtag search is free but capped (30 hashtags/week). Fuller coverage via the listening vendor above.",
    unlocks: "Hashtag activity and Reels formats.",
    phase: 3,
  },
  {
    id: "kick",
    name: "Kick",
    category: "streaming",
    access: "free-key",
    liveAdapter: false,
    envKeys: ["KICK_CLIENT_ID", "KICK_CLIENT_SECRET"],
    monthlyCost: { low: 0, high: 0 },
    costNote: "Young public API, limited endpoints",
    unlocks: "Top gambling streams and viewer spikes on the platform closest to our audience.",
    phase: 3,
  },
  {
    id: "dune",
    name: "Dune",
    category: "onchain",
    access: "paid",
    liveAdapter: false,
    envKeys: ["DUNE_API_KEY"],
    monthlyCost: { low: 0, high: 390 },
    costNote: "Free tier for prototyping; Plus for scheduled queries.",
    unlocks: "Casino deposit flows and wallet behaviour across chains.",
    phase: 3,
  },
  {
    id: "arkham",
    name: "Arkham",
    category: "onchain",
    access: "agreement",
    liveAdapter: false,
    envKeys: ["ARKHAM_API_KEY"],
    monthlyCost: { low: 0, high: 500 },
    costNote: "API access by application",
    unlocks: "Labelled entities: which wallets belong to which casinos and whales.",
    phase: 3,
  },
  {
    id: "crawl",
    name: "Crawl and search (Firecrawl, Exa, Apify)",
    category: "crawl",
    access: "paid",
    liveAdapter: false,
    envKeys: ["FIRECRAWL_API_KEY", "EXA_API_KEY", "APIFY_TOKEN"],
    monthlyCost: { low: 250, high: 500 },
    costNote: "Mixed plans",
    unlocks: "Competitor sites and socials, platform policy pages, Know Your Meme lookups (within terms).",
    phase: 3,
  },
];

/**
 * Brian runs at two speeds, so costs are shown two ways (all estimates):
 *  - Radar: always on, fixed monthly. Sweeps, staging, daily ideas, Rapid Response.
 *  - Campaign builds: pay per use. Opus and image generation run only on Develop.
 */
export interface CostLine {
  id: string;
  name: string;
  monthlyCost: { low: number; high: number };
  note: string;
}

export const RADAR_COSTS: CostLine[] = [
  {
    id: "claude-radar",
    name: "Claude for the radar",
    monthlyCost: { low: 100, high: 300 },
    note: "Relevance scoring on Haiku 5.5, daily idea runs on the top trends, Rapid Response takes on Opus 5.5",
  },
  {
    id: "infra",
    name: "Hosting, database, job queue",
    monthlyCost: { low: 100, high: 250 },
    note: "Vercel, Supabase, Trigger.dev",
  },
];

export const CAMPAIGN_COST = {
  low: 5,
  high: 30,
  note: "Per full package: about 10 Opus 5.5 calls plus web research (≈ $3–8), key visual and mockup imagery (≈ $1–5), video storyboard frames when used (≈ $5–15). Zero in a month with no new campaign.",
};

export interface Preset {
  id: "lean" | "standard" | "full";
  name: string;
  summary: string;
  sourceIds: string[];
}

const FREE_IDS = SOURCES.filter((s) => s.monthlyCost.high === 0).map((s) => s.id);

export const PRESETS: Preset[] = [
  {
    id: "lean",
    name: "Lean",
    summary: "Free sources plus X Basic. Enough for daily ideas and Rapid Response on the biggest moments.",
    sourceIds: [...FREE_IDS, "x"],
  },
  {
    id: "standard",
    name: "Standard",
    summary: "Adds Reddit, Google Trends, on-chain and crawling. Catches memes before they reach X.",
    sourceIds: [...FREE_IDS, "x", "reddit", "googletrends", "etherscan", "dune", "crawl"],
  },
  {
    id: "full",
    name: "Full",
    summary: "Everything in the brief, including X Pro and TikTok/Instagram via a listening vendor.",
    sourceIds: SOURCES.map((s) => s.id),
  },
];

/** X is priced by tier: Basic in Lean/Standard, Pro in Full. */
export function sourceCostInPreset(def: SourceDef, preset: Preset["id"]): { low: number; high: number } {
  if (def.id === "x") return preset === "full" ? { low: 5000, high: 5000 } : { low: 200, high: 200 };
  return def.monthlyCost;
}

export function presetMonthly(preset: Preset["id"]): { low: number; high: number } {
  const p = PRESETS.find((x) => x.id === preset)!;
  const sources = SOURCES.filter((s) => p.sourceIds.includes(s.id)).map((s) => ({ monthlyCost: sourceCostInPreset(s, preset) }));
  return sumCosts([...sources, ...RADAR_COSTS]);
}

export function sumCosts(lines: { monthlyCost: { low: number; high: number } }[]) {
  return lines.reduce(
    (acc, l) => ({ low: acc.low + l.monthlyCost.low, high: acc.high + l.monthlyCost.high }),
    { low: 0, high: 0 },
  );
}

export function sourceById(id: string): SourceDef | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function isConfigured(def: SourceDef, env: Record<string, string | undefined> = process.env): boolean {
  return def.envKeys.every((k) => !!env[k]);
}
