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

/**
 * Reference stunts from outside gambling: the attention patterns that work.
 * Facts are limited to what's widely documented; results are left out until sourced.
 */
export const REFERENCE_STUNTS: { brand: string; what: string; why: string }[] = [
  { brand: "Burger King", what: "The Whopper Detour (2018): its app unlocked a 1-cent Whopper only when you were standing near a McDonald's.", why: "Turned a rival's locations into its own media. People went to McDonald's to troll McDonald's." },
  { brand: "KFC", what: "Its Twitter account followed exactly 11 people: the 5 Spice Girls and 6 men named Herb (2017).", why: "An Easter egg so dumb and perfect that one person noticing it made it go global. Cost: nothing." },
  { brand: "Duolingo", what: "Killed off its own mascot, Duo the owl, and staged a 'funeral' with the internet (2025).", why: "Brands don't kill their mascot. The audience joined in as if it were a celebrity death." },
  { brand: "Liquid Death", what: "Sold canned water branded like a heavy-metal beer ('Murder your thirst').", why: "An absurd frame on a boring product. The brand itself is the joke people share." },
  { brand: "MSCHF", what: "Made 'Satan Shoes' with Lil Nas X (2021) and Big Red Boots (2023).", why: "Objects that only exist to be argued about. Outrage was the distribution." },
  { brand: "Oreo", what: "'You can still dunk in the dark' posted within minutes of the 2013 Super Bowl blackout.", why: "Speed. Everyone was watching the same moment and one brand said the obvious thing first." },
  { brand: "Ryanair", what: "Runs its TikTok as a self-roasting plane with a face that insults its own customers.", why: "Leans into what people already say about it. Self-awareness is shareable." },
  { brand: "Kick", what: "Signed xQc to a reported multi-year deal worth tens of millions (2023).", why: "Bought the conversation: every clip of the biggest streamer now carried Kick's name." },
];

/** The ways things actually spread. Every idea uses at least one. */
export const ATTENTION_PLAYBOOK: { id: string; name: string; how: string }[] = [
  { id: "hijack", name: "Hijack a moment", how: "Insert Cashy into something millions are already watching or memeing, fast and first." },
  { id: "irl-stunt", name: "Absurd real-world stunt", how: "Do something physical that's insane enough to be filmed and shared: a billboard, a giant object, a public act." },
  { id: "collab", name: "Unexpected collaboration", how: "Team up with a brand, creator, artist or community nobody would expect a casino to touch." },
  { id: "parody-product", name: "Parody or fake product", how: "Launch a ridiculous product, drop or merch item that exists to be talked about." },
  { id: "troll", name: "Troll the timeline", how: "Publicly bait a rival, a celebrity moment or an industry norm, cheekily and without defamation." },
  { id: "internet-object", name: "Internet-native object", how: "Build a bot, filter, game, website, AI thing or coin that people play with and share." },
  { id: "buy-something", name: "Buy something ridiculous", how: "Naming rights, a sponsorship of something absurd, buying an object or domain the internet cares about." },
  { id: "creator-chaos", name: "Creator chaos", how: "A streamer or creator deal with a twist so strange the deal itself is the content." },
  { id: "easter-egg", name: "Easter egg", how: "Hide something for the internet to discover; the discovery does the marketing." },
  { id: "character", name: "Character or mascot", how: "A persona, mascot or account voice people follow for its own sake." },
  { id: "mystery", name: "Mystery and teaser", how: "Something unexplained in public that makes people hunt for the answer." },
];

export const QUALITY_BAR = {
  traits: [
    "Attention first: the only goals are shares, impressions and people talking. Cashy is the brand behind it, not the subject of it.",
    "Cool on its own, Cashy subtle but unmistakable: the thing has to be worth sharing even if the logo were removed, and Cashy's name rides along on it (a logo, a signature, a name, an Easter egg), the way Stake's logo rode legacy meme videos. If it only works by telling people Cashy is great, it's dead.",
    "Simple: one twist, explainable in one sentence a stranger would repeat to a friend.",
    "\"Wait, what?\": the first reaction is disbelief, a laugh or outrage. Never a nod.",
    "It spreads itself: meme pages, creators and press pass it on without being paid.",
    "Uses something that already exists: a meme, a moment, a person, an object, a platform behaviour.",
    "People know it was Cashy: the name is in the joke, on the object or in the headline.",
    "Cheap to run: the cost is the idea, not the media budget.",
  ],
  banned: [
    "Anything whose point is Cashy's product or strengths: payout or withdrawal speed, wagering, win caps, bonuses, games count, transparency, proof, trust, fairness, the Justice Fund or AskGamblers",
    "Comparisons with rivals' terms, exposés of how casinos treat players, or 'switch to us' offers",
    "Dashboards, trackers, indexes, ledgers, wanted boards, transparency pages or anything that is mainly a page of data",
    "Explainers, PSAs, trust campaigns and anything that needs a feature explained",
    "Challenges (\"24-hour challenge\", \"spin streak challenge\")",
    "Polls and questions to the audience",
    "Races or comparisons against everyday things (\"withdrawal vs pizza delivery\")",
    "Leaderboards, giveaways, bonus tweaks or tournaments presented as innovation",
    "A standard promotion with a new name",
    "Anything a viewer would scroll past without reacting",
  ],
  tests: [
    { id: "one-sentence", name: "One-sentence test", question: "Can it be explained in one sentence someone would retell at a bar?" },
    { id: "share", name: "Share test", question: "Would a meme page or a creator repost it unprompted, with their own take?" },
    { id: "headline", name: "Headline test", question: "Would gaming, culture, crypto or mainstream press write about it? Write the headline." },
    { id: "argument", name: "Argument test", question: "Would people argue about whether it was genius, real, or out of line?" },
    { id: "attribution", name: "Attribution test", question: "Is it cool without the logo, and is Cashy's name still unmistakably on it when it's shared? Subtle presence, not a sales message." },
  ],
  /**
   * The only hard stops. Everything else (offensive, crude or dark humour,
   * shock, taboo, roasting rivals and public figures, pranks, stunts in other
   * countries) passes with its consequences spelled out.
   */
  redLines: [
    "Taking bets, or pushing sign-ups and deposits, from players in markets where it's illegal. A brand stunt that merely happens somewhere, or that people anywhere can watch, is not this: flag the market for legal instead",
    "Anything aimed at or appealing to minors",
    "Hate speech, slurs or content attacking people for race, religion, ethnicity, sexuality, gender, disability or similar. Edgy and offensive humour is fine; hate is not",
    "Exploiting real tragedies: deaths, disasters, attacks and their victims",
    "Fake quotes, fake endorsements or defamation of real people. Parody, roasting and reacting to their public moments are fine",
    "Fraud, scams or deception that costs people money, or misusing personal data. Harmless pranks and misdirection are fine",
    "Targeting people showing signs of gambling harm, or undermining responsible-gambling protections",
  ],

};
