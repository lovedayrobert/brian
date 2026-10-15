import type { Citation } from "@/lib/domain/types";

/**
 * The idea quality bar (brief §2b) and stunt library (§3c). These are the
 * Inventor's and Critic's ground truth. Stunt entries carry what we know and
 * where it came from; results are only stated where a source supports them.
 */
const BRIEF: Citation = {
  url: "internal:brian-build-brief",
  title: "Brian build brief, section 2b (Rob Loveday)",
  publisher: "Cashy internal",
  retrievedAt: "2026-10-15T00:00:00Z",
};

export interface Stunt {
  id: string;
  brand: string;
  what: string;
  twist: string;
  whyItWorked: string;
  kind: "brand hijack" | "outrage format" | "data play" | "contract stunt" | "rival-baiting" | "meme hijack";
  result: string | null; // null until a sourced result is added
  sources: Citation[];
}

export const STUNTS: Stunt[] = [
  {
    id: "stake-meme-logo",
    brand: "Stake",
    what: "Added its logo into legacy viral meme videos.",
    twist: "Hijack culture people already love and share; every repost is free distribution.",
    whyItWorked: "Near-zero cost. Borrowed attention from memes with built-in audiences.",
    kind: "meme hijack",
    result: null,
    sources: [BRIEF],
  },
  {
    id: "duel-offensive-blackjack",
    brand: "Duel",
    what: "Launched a risky, offensive live blackjack game.",
    twist: "A format designed to make people argue.",
    whyItWorked: "Outrage and clips spread it further than any ad could.",
    kind: "outrage format",
    result: null,
    sources: [BRIEF],
  },
  {
    id: "housebets-wallet-rewards",
    brand: "Housebets",
    what: "Rewards based on a player's past deposits to other casinos, read from their crypto wallet.",
    twist: "Public on-chain data turned into a weapon to steal competitors' players.",
    whyItWorked: "Only possible in crypto. The mechanic itself is the headline.",
    kind: "data play",
    result: null,
    sources: [BRIEF],
  },
  {
    id: "shuffle-doherty-clause",
    brand: "Shuffle",
    what: "Signed Jack Doherty to a deal that stopped him posting for six months, without him realising.",
    twist: "A clause in a contract became the headline.",
    whyItWorked: "One sentence, instantly repeatable, and the whole internet talked.",
    kind: "contract stunt",
    result: null,
    sources: [BRIEF],
  },
];

export const QUALITY_BAR = {
  traits: [
    "Simple: one twist, explainable in one sentence a stranger would repeat to a friend.",
    "\"Wait, what?\": the first reaction is disbelief, a laugh or outrage. Never a nod.",
    "It spreads itself: people screenshot it, argue about it, and press writes about it unpaid.",
    "Uses something that already exists: a meme, a person, a contract, public data, a cultural moment.",
    "Cheap to run, hard to copy: the cost is the idea, not the media budget.",
    "Native to crypto and internet culture. Would not make sense for a traditional casino.",
  ],
  banned: [
    "Challenges (\"24-hour challenge\", \"spin streak challenge\")",
    "Polls and questions to the audience",
    "Races or comparisons against everyday things (\"withdrawal vs pizza delivery\")",
    "Leaderboards, giveaways, bonus tweaks or tournaments presented as innovation",
    "A standard promotion with a new name",
    "Anything a viewer would scroll past without reacting",
    "Ideas whose appeal depends on explaining a feature",
  ],
  tests: [
    { id: "one-sentence", name: "One-sentence test", question: "Can it be explained in one sentence someone would retell at a bar?" },
    { id: "screenshot", name: "Screenshot test", question: "Would people screenshot it and post it with their own take?" },
    { id: "headline", name: "Headline test", question: "Would iGaming or crypto press write about it unprompted? Write the headline." },
    { id: "argument", name: "Argument test", question: "Would people argue about whether it was genius, real, or out of line?" },
    { id: "copy", name: "Copy test", question: "Could Stake or Shuffle run this tomorrow just as well? If yes, it is not ours." },
  ],
  redLines: [
    "Anything illegal in our operating markets",
    "Targeting or appealing to minors",
    "Impersonating, defaming, or fabricating statements from real people, or implying a real person endorses us without an agreement. Reacting to public moments and memes about public figures is fine.",
    "Exploiting tragedies: deaths, disasters, attacks and victims",
    "Undermining responsible-gambling protections or targeting people showing signs of harm",
    "Fraud, deception that causes financial harm, or misuse of personal data beyond what law and platform terms allow",
    "Hate speech or content targeting protected groups",
  ],
};
