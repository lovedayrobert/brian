// Core domain model for Brian. Mirrors the Postgres schema in supabase/migrations.
// Every factual statement is a Claim backed by Citations; every number is an Input
// carrying its provenance. The UI renders from these, so "no source, no claim"
// is enforced by data, not by prompt wording.

export type BrandId = "cashy" | "bitstarz";

export type Provenance = "measured" | "benchmark" | "assumption";

export interface Citation {
  url: string;
  title: string;
  publisher?: string;
  retrievedAt: string; // ISO
}

export interface Claim {
  text: string;
  citations: Citation[];
  status: "verified" | "unresolved";
}

/** A number with a range and an origin. Used by forecasts and business cases. */
export interface Input {
  key: string;
  label: string;
  unit: "count" | "ratio" | "usd" | "days";
  low: number;
  expected: number;
  high: number;
  provenance: Provenance;
  origin: string; // where the number came from, in words
  citation?: Citation;
}

// ---------- Discovery ----------

export type SourceCategory =
  | "social"
  | "video"
  | "streaming"
  | "search"
  | "news"
  | "memes"
  | "onchain"
  | "markets"
  | "industry"
  | "crawl";

export interface Signal {
  id: string;
  sourceId: string;
  url: string;
  title: string;
  summary?: string;
  author?: string;
  imageUrl?: string;
  /** Primary engagement number for this signal (views, volume, articles) */
  metric?: { label: string; value: number };
  /** Daily series, oldest first, when the source provides history */
  series?: { date: string; value: number }[];
  /** Rolling averages when a source has no daily series (e.g. Polymarket) */
  rates?: { day: number; weekAvg: number; monthAvg: number };
  /** Memecoin stats, for coins from the trenches */
  coin?: {
    address: string;
    name: string;
    symbol: string;
    volume1h: number;
    volume6h: number;
    volume24h: number;
    buyers1h: number;
    buyers24h: number;
    change24h: number;
    fdv: number;
    ageHours: number;
    dex: string;
    x?: string;
  };
  /** For coins: what it references, and whether it's culture at all */
  narrative?: { kind: "culture" | "utility" | "generic"; reference: string; method: "model" | "heuristic" };
  /** Related stories (e.g. the news behind a search spike) */
  related?: { title: string; url: string; outlet: string }[];
  topics: string[];
  capturedAt: string;
  publishedAt?: string;
}

export type LifecycleStage = "emerging" | "rising" | "peaking" | "saturated" | "declining";
export type Confidence = "low" | "medium" | "high";

export interface LifecycleAssessment {
  stage: LifecycleStage;
  confidence: Confidence;
  confidenceScore: number; // 0..1
  velocity: number; // ratio of last-3-day mean to prior-3-day mean
  acceleration: number; // change in velocity
  peakRatio: number; // current / peak
  baselineRatio: number; // current / early baseline
  evidence: string[];
}

export type Sensitivity = "clear" | "caution" | "blocked";

export interface Trend {
  id: string;
  title: string;
  summary: string;
  category: string; // crypto, gambling, gaming, sport, entertainment, politics, tech, culture
  relevance: number; // 0..1 heuristic or model score
  relevanceMethod: "heuristic" | "model";
  whyItMatters?: string;
  signalIds: string[];
  sourceIds: string[];
  series: { date: string; value: number }[];
  seriesLabel: string;
  headline?: { label: string; value: number };
  coins?: CoinRef[];
  lifecycle: LifecycleAssessment;
  sensitivity: Sensitivity;
  sensitivityReason?: string;
  imageUrl?: string;
  updatedAt: string;
}

export interface Moment {
  id: string;
  kind: "breaking" | "calendar";
  title: string;
  date: string;
  category: string;
  description: string;
  sourceUrl?: string;
  sensitivity: Sensitivity;
  sensitivityReason?: string;
  outlets?: number;
  /** A culture coin with no matching news: the trenches found it first */
  trenchFirst?: boolean;
  /** Memecoins named after this moment: the trenches are already on it */
  coins?: CoinRef[];
  /** Trade news (regulation, deals). Shown under Industry, not in the main Live feed. */
  industry?: boolean;
  /** Approximate search volume when the moment is a search spike */
  searches?: number;
  sources?: { title: string; url: string; outlet: string }[];
  relevance?: number;
  imageUrl?: string;
  /** Free-text note on how sure we are of the date */
  dateNote?: string;
}

// ---------- Ideas ----------

export type EdgeLevel = "safe" | "spicy" | "wild";

export interface Score {
  value: number; // 1..10
  reason: string;
}

export interface Idea {
  id: string;
  brandId: BrandId;
  trendId?: string;
  momentId?: string;
  /** Where the idea came from: a trend, a breaking moment, or the Opportunity Lab */
  origin?: "trend" | "moment" | "lab";
  /** Hand-written sample to show the format. Never presented as Brian's output. */
  sample?: boolean;
  /** Imported for a blind review: kept off lists so scores stay hidden. */
  reviewOnly?: boolean;
  /**
   * reactive: rides a story or trend, live within 24 hours, dead in 24-48.
   * evergreen: a simple, durable brand play nobody in our space has done.
   */
  horizon?: Horizon;
  effort?: string;
  shelfLife?: string;
  /** What the idea came from, kept with the idea so it travels with it */
  sourceContext?: SourceContext;
  lens?: string;
  name: string;
  oneLiner: string;
  headline: string;
  edge: EdgeLevel;
  backlash: string;
  mechanism: string; // the single twist
  borrowedAttention: string; // what existing thing it hijacks
  evidence: Claim[];
  /** Engine 2: shareability, reach, novelty, attribution, cost. Engine 1 (legacy): talkability, simplicity, ownability, cost. */
  scores: Record<string, Score>;
  /** Which idea engine produced it. 4 = single acts aimed at a feeling (current); 3 = native content; 2 = attention stunts; 1 = USP-led. */
  engine?: 1 | 2 | 3 | 4;
  /** Engine 2: attention mechanic id. Engine 3: content format id (CONTENT_FORMATS). */
  attentionMechanic?: string;
  /** Who asked Brian for it, and the spark it started from */
  createdBy?: string;
  spark?: { text: string; swipeId?: string };
  /** How big: reply, post, meme, act or campaign */
  size?: "reply" | "post" | "meme" | "act" | "campaign";
  /** Which model invented it (Opus, Fable, GPT-6 Astra) */
  madeBy?: string;
  /** Which world it's about (streaming, sport, crypto…), for spreading ideas out. */
  world?: string;
  /** Who or what it's about, in a few words */
  subject?: string;
  /** For replies, posts and memes: the exact words */
  post?: string;
  /** Engine 4: the act, the feeling it aims and the reaction it gets */
  emotion?: string;
  emotionTarget?: string;
  reactions?: { who: string; says: string; shares: boolean }[];
  howItWorks?: string;
  proof?: string;
  pulseRef?: string;
  /** Engine 3: the piece of content itself */
  platform?: string;
  hook?: string;
  script?: string;
  whyViews?: string;
  series?: string;
  shareMoment?: string;
  whoAmplifies?: string;
  cashyRole?: string;
  screening: Screening;
  status: "candidate" | "killed" | "card" | "developing" | "developed";
  keyVisualPrompt: string;
  createdAt: string;
}

export interface Screening {
  critic: {
    verdict: "pass" | "kill";
    tests: { name: string; pass: boolean; note: string }[];
    bannedPatternHit?: string;
    reasons: string[];
  };
  priorArt: { found: boolean; summary: string; examples: Claim[] } | null;
  redLines: { pass: boolean; issues: string[]; consequences: string[] } | null;
}

// ---------- Develop ----------

export type SectionKey =
  | "executive"
  | "insight"
  | "strategy"
  | "creative"
  | "mockups"
  | "channels"
  | "production"
  | "measurement"
  | "business"
  | "risk"
  | "handover";

export type SectionStatus = "pending" | "running" | "done" | "error" | "skipped";

export interface PackageSection<T = unknown> {
  key: SectionKey;
  status: SectionStatus;
  content?: T;
  error?: string;
  model?: string;
  updatedAt?: string;
}

export type PackageStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "in_production"
  | "live"
  | "complete";

export interface Package {
  id: string;
  ideaId: string;
  brandId: BrandId;
  status: PackageStatus;
  version: number;
  sample?: boolean;
  reviewOnly?: boolean;
  /** full: the 11-section campaign package. quick: copy, visuals and risk for a reactive idea. */
  kind?: "full" | "quick";
  /** Target launch, set once from the trend's lifecycle so every section plans to the same day. */
  launchDate: string;
  sections: Record<SectionKey, PackageSection>;
  steering: { at: string; instruction: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  agent: string;
  model: string;
  startedAt: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  ok: boolean;
  error?: string;
  subject?: string;
  /** Who started it (the signed-in person) */
  by?: string;
}

export interface SweepRun {
  id: string;
  startedAt: string;
  finishedAt: string;
  sources: { sourceId: string; ok: boolean; signals: number; error?: string }[];
}

export interface CoinRef {
  name: string;
  symbol: string;
  url: string;
  volume6h: number;
}

export interface SourceContext {
  kind: "trend" | "moment" | "lab";
  title: string;
  url?: string;
  summary?: string;
  links?: { title: string; url: string; outlet?: string }[];
}

export type Horizon = "reactive" | "evergreen";

/** The Pulse: what the audience is consuming right now and the feeling driving it. */
export interface PulseItem {
  subject: string;
  world?: string;
  happening: string;
  emotion: string;
  intensity: number;
  why: string;
  where: string;
  lifespan: string;
  opening: string | null;
  urls: string[];
}

export interface Pulse {
  id: string;
  createdAt: string;
  mood: string;
  villain: string | null;
  mainCharacter: string | null;
  items: PulseItem[];
  signalCount: number;
}

/** A post the team finds clever. Teaches Brian the team's taste; never copied. */
export interface Swipe {
  id: string;
  url: string;
  title: string;
  author?: string;
  platform: string;
  metrics?: Record<string, number>;
  /** Why the team likes it, in their words (optional: Brian explains it either way) */
  why: string;
  addedBy: string;
  addedAt: string;
  /** The post's words, or the start of the article, for Brian to read */
  text?: string;
  /** The moment it was made for: "Halloween", "World Cup", "GTA 6 launch" */
  event?: string;
  /** Whose it was */
  owner?: "ours" | "competitor" | "other";
  /** Brian's explanation of why it worked, revised with the team's feedback */
  breakdown?: Breakdown;
  /** What the team said about Brian's explanation */
  feedback?: { by: string; at: string; verdict: "right" | "partly" | "wrong"; note?: string }[];
}

export interface Breakdown {
  at: string;
  whatHappened: string;
  feeling: string;
  whySpread: string;
  whyBrand: string;
  timing: string;
  /** The reusable lesson, one line */
  lesson: string;
  /** The surface that must never be copied: the object, format or target */
  dontCopy: string;
  /** What Brian couldn't tell from the link (e.g. it's a video he can't watch) */
  unsure?: string;
}

/** Who Cashy is, built from everything the team has taught Brian. */
export interface Identity {
  at: string;
  summary: string;
  taste: string[];
  lessons: { lesson: string; why: string; examples: string[] }[];
  avoid: string[];
  basedOn: number;
}

/** Anything the marketing team plans: a post, a CRM send, a campaign, a stunt. */
export type CalendarChannel = "X" | "TikTok" | "Instagram" | "YouTube" | "Kick" | "Telegram" | "Discord" | "Email" | "Push" | "SMS" | "Website" | "IRL" | "Other";
export type CalendarStatus = "idea" | "planned" | "in-progress" | "scheduled" | "live" | "done";

export interface CalendarItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  time?: string; // HH:MM, optional
  channel: CalendarChannel;
  type: "social" | "crm" | "campaign" | "stunt" | "other";
  status: CalendarStatus;
  owner?: string;
  notes?: string;
  /** 0 none, 1 urgent, 2 high, 3 medium, 4 low (Linear's scale) */
  priority?: number;
  labels?: string[];
  project?: string;
  ideaId?: string;
  specialDayId?: string;
  /** Where it came from: made in Brian, the CRM sheet, or Linear */
  source: "brian" | "crm-sheet" | "linear";
  /** Set once synced to Linear */
  linear?: { id: string; identifier: string; url: string; state?: string; syncedAt: string };
  /** CRM rows the sheet marks as needing social support */
  needsSocial?: boolean;
  createdBy?: string;
  updatedAt: string;
}
