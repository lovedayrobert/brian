import type { Citation } from "@/lib/domain/types";

/**
 * Engine 4: the idea quality bar. Rob's brief, after engines 2 (agency stunts)
 * and 3 (TikTok formats and series) both missed: the plays that worked for
 * crypto casinos were single real acts that aimed a feeling the audience
 * already had (hate, outrage, love, "wtf") at full strength. These are the
 * Inventor's and the audience panel's ground truth.
 */
const BRIEF: Citation = {
  url: "internal:brian-build-brief",
  title: "Brian build brief, section 2b, and Rob Loveday's feedback, 16 Oct 2026",
  publisher: "Cashy internal",
  retrievedAt: "2026-10-16T00:00:00Z",
};

export interface Stunt {
  id: string;
  brand: string;
  what: string;
  /** The feeling it aimed, and at whom */
  emotion: string;
  /** What people actually said when they shared it */
  shareLine: string;
  whyItWorked: string;
  kind: string;
  result: string | null; // null until a sourced result is added
  sources: Citation[];
}

/** The benchmark. Facts are as given in the brief and by Rob; results are left out until sourced. */
export const STUNTS: Stunt[] = [
  {
    id: "shuffle-doherty-clause",
    brand: "Shuffle",
    what: "Signed Jack Doherty to a deal that stopped him posting for six months.",
    emotion: "Hate. A huge part of the internet can't stand him; the deal gave them what they wanted.",
    shareLine: "finally someone shut him up",
    whyItWorked: "The audience's own feeling is the punchline. One sentence, no explanation, and you can't retell it without saying Shuffle.",
    kind: "villain play",
    result: null,
    sources: [BRIEF],
  },
  {
    id: "duel-offensive-blackjack",
    brand: "Duel",
    what: "Ran a live blackjack game where the host wore an offensive costume.",
    emotion: "Outrage and love-hate. People shared it to condemn it, and fans shared it because it was so wrong it was funny. Both spread it.",
    shareLine: "they actually did this lmao / this is disgusting",
    whyItWorked: "Too far on purpose. Condemnation is distribution. It cost a costume.",
    kind: "too far",
    result: null,
    sources: [BRIEF],
  },
  {
    id: "stake-meme-logo",
    brand: "Stake",
    what: "Put its logo into legacy viral meme videos, so it turned up on clip after clip people were already reposting.",
    emotion: "Love and familiarity. People already loved those videos; Stake just rode along on every repost.",
    shareLine: "why is the Stake logo on every video lol",
    whyItWorked: "The mechanism is the idea: distribution, not content. Near-zero cost, everywhere at once, and the ubiquity itself became the joke.",
    kind: "be everywhere",
    result: null,
    sources: [BRIEF],
  },
  {
    id: "fridge-casino",
    brand: "A crypto casino (per Rob)",
    what: "Sent a guy into a kitchen store to play on the casino site on a display fridge that had a web browser.",
    emotion: "WTF disbelief: 'wait, you can do that?'",
    shareLine: "bro is gambling on a fridge",
    whyItWorked: "The casino thing, somewhere it absolutely shouldn't be. Real, filmed raw on a phone, cheap, and nobody had done it.",
    kind: "wrong place",
    result: null,
    sources: [BRIEF],
  },
  {
    id: "gta-map-directions",
    brand: "@itsHunterTV (creator, not a brand)",
    what: "Asked real strangers in LA for directions using a printed GTA 5 map. 255k views and 1,280 bookmarks from a 75k-follower account, a month before GTA 6.",
    emotion: "WTF and hype: the game world colliding with the real city, at peak GTA anticipation.",
    shareLine: "bro is navigating LA with the GTA map",
    whyItWorked: "One real act, real people's genuine confusion as the content, zero cost, riding the biggest anticipation of the year. Nothing scripted.",
    kind: "wrong place",
    result: null,
    sources: [{ url: "https://x.com/itsHunterTV/status/2110739181836333321", title: "Asking for directions in LA using GTA 5 map", publisher: "X (@itsHunterTV)", retrievedAt: "2026-10-16T00:00:00Z" }],
  },
  {
    id: "housebets-wallet-rewards",
    brand: "Housebets",
    what: "Rewards based on a player's past deposits to other casinos, read from their crypto wallet.",
    emotion: "Tribal and cheeky: stealing rivals' players in public.",
    shareLine: "they're reading your wallet to poach you",
    whyItWorked: "Only possible in crypto. The act is the headline.",
    kind: "rival raid",
    result: null,
    sources: [BRIEF],
  },
];

/** Outside gambling: the same pattern of one real act aimed at a strong feeling. Widely documented; results left out. */
export const REFERENCE_MOVES: { who: string; what: string; emotion: string }[] = [
  { who: "Burger King", what: "The Moldy Whopper (2020): ads showing a Whopper rotting over 34 days.", emotion: "Disgust, used on purpose: people shared it because it was gross." },
  { who: "Liquid Death", what: "Turned its worst hate comments into a heavy-metal album.", emotion: "Hate as fuel: the haters became the content." },
  { who: "KFC", what: "Its X account followed only the five Spice Girls and six men named Herb.", emotion: "WTF discovery: one person noticed, everyone shared." },
  { who: "Burger King", what: "The Whopper Detour: a 1-cent Whopper unlocked only when you stood near a McDonald's.", emotion: "Tribal and petty: trolling the rival using the rival's own locations." },
];

/** The feelings that make people share. Every idea names one. */
export const EMOTIONS: { id: string; name: string; why: string }[] = [
  { id: "hate", name: "Hate", why: "Shared to agree with everyone who can't stand the same person or thing: 'finally'." },
  { id: "outrage", name: "Outrage / love-hate", why: "Shared to condemn it and shared because it's so wrong it's funny. Both spread it." },
  { id: "wtf", name: "WTF disbelief", why: "Shared because 'wait, is this real?' needs a second opinion." },
  { id: "schadenfreude", name: "Schadenfreude", why: "Shared to enjoy someone's public fall together." },
  { id: "tribal", name: "Tribal", why: "Shared to take a side: us versus them, rival versus rival, fans versus haters." },
  { id: "disgust", name: "Disgust", why: "Shared because it's gross and you have to show someone." },
  { id: "love", name: "Love / hype", why: "Shared because people already love the thing it rides." },
  { id: "envy", name: "Envy / aspiration", why: "Shared because 'I wish that was me'." },
];

/** The kinds of act that worked. Each lens and each idea is one of these. */
export const MOVES: { id: string; name: string; how: string; from: string }[] = [
  { id: "villain", name: "Say what everyone's thinking", how: "When most people dislike someone or something right now, the post or meme that says what everyone's thinking, so they share it to agree. Never an offer or message to the person.", from: "" },
  { id: "too-far", name: "Too far", how: "Do something offensive, wrong or taboo enough that people share it to condemn it while fans share it because it's funny.", from: "Duel's blackjack" },
  { id: "everywhere", name: "Be everywhere", how: "Put Cashy's name where attention already is, at a scale nobody else bothers with: inside viral videos, memes, clips, game lobbies, streams, comment sections, usernames. The distribution is the idea.", from: "Stake's logo on viral videos" },
  { id: "wrong-place", name: "Wrong place", how: "Do the casino thing somewhere it absolutely shouldn't happen or be possible (a fridge, a car screen, a shop TV, a smart device), for real, filmed raw on a phone.", from: "Gambling on a kitchen-store fridge" },
  { id: "deal-twist", name: "Offer with a twist", how: "A public offer to our own players or to everyone, whose terms are the joke and tied to what people are talking about. Never an offer to a famous person.", from: "" },
  { id: "main-character", name: "Main character of the day", how: "Do something real to, for or about whatever the internet is obsessed with today, while it's still the only thing anyone talks about.", from: "Oreo in the Super Bowl blackout" },
  { id: "rival-raid", name: "Rival raid", how: "Steal rivals' players, attention or moments in public, cheekily: their streamers, their fans, their bad news.", from: "Housebets reading rivals' wallets" },
  { id: "schadenfreude", name: "Laugh at the fall", how: "Mark someone's public failure (a rival, a public figure, a brand) with a real act that lets people enjoy it together.", from: "" },
];

export function moveName(id: string): string {
  return MOVES.find((m) => m.id === id)?.name ?? CONTENT_FORMATS.find((f) => f.id === id)?.name ?? id;
}
export function emotionName(id: string): string {
  return EMOTIONS.find((e) => e.id === id)?.name ?? id;
}

/** The audience panel. The Critic answers as each of these, instinctively, before judging. */
export const AUDIENCE_PANEL: { id: string; who: string }[] = [
  { id: "degen", who: "Degen, 24: lives on crypto Twitter and Kick, gambles, has seen every casino promo" },
  { id: "clipper", who: "Clip and drama account admin: decides what gets posted to a million followers, posts what makes people react" },
  { id: "teen", who: "19-year-old on TikTok: doesn't gamble, doesn't care about casinos, shares what's funny or insane" },
  { id: "hater", who: "Someone who hates gambling brands: shares things to dunk on them" },
  { id: "rival", who: "Marketer at Stake or Shuffle: knows what's been done, and would be jealous only of a genuine first" },
];

export const QUALITY_BAR = {
  traits: [
    "The right size: the smallest thing that lands. Most moments need one sharp post, reply or meme, written out in full. Only a strong feeling earns a real act (something Cashy actually does: pays, sends, builds, puts its name somewhere, plays somewhere absurd). Campaigns almost never. A joke that works as a tweet must stay a tweet.",
    "It aims a feeling the audience already has, at full strength: hate, outrage, wtf, schadenfreude, tribalism, disgust, love. Cashy doesn't create the feeling; it points it.",
    "One sentence, retold with no explanation: 'Shuffle paid Jack Doherty to stop posting.' If it needs a second sentence, it's dead.",
    "People share it to say something about themselves: 'finally', 'this is so wrong lmao', 'wait, is that real?'. Write that line.",
    "Raw, cheap and real: a phone, a person, a contract, a logo. Polish says 'ad'.",
    "You can't retell it without saying Cashy.",
    "Nobody has done it. A first, not a format.",
  ],
  banned: [
    "Scripted content as the idea: TikTok POVs, acted skits, slideshows, memes, threads, replies, series, recurring bits, characters. A real act filmed with real reactions is fine; anything acted out is not",
    "Campaigns, multi-phase plans, launches and anything that needs explaining",
    "Polished agency stunts: giant objects, billboards as art, flash mobs, mascots, press conferences, fake product launches, merch drops",
    "Anything whose point is Cashy's product or strengths: payouts, bonuses, wagering, games, transparency, trust, the Justice Fund",
    "Challenges, polls, giveaways, tournaments, leaderboards and renamed promotions",
    "Pun names, 'world's first', 'the ultimate', 'unhinged', 'legendary' and anything that sounds like an AI or an agency wrote it",
    "Ideas with no emotion behind them: clever, nice or interesting isn't enough",
  ],
  tests: [
    { id: "size", name: "Right-size test", question: "Is it the smallest thing that lands: a post, reply or meme for a small joke, a real act only for a strong feeling, never a joke inflated into a campaign? Can it be retold in one sentence?" },
    { id: "feeling", name: "Feeling test", question: "Does it aim a strong feeling the audience already has (hate, outrage, wtf, schadenfreude, tribal, disgust, love) at full strength?" },
    { id: "share", name: "Share test", question: "Would the panel share it? Count love-hate: haters sharing to condemn it is a pass." },
    { id: "real", name: "Real test", question: "Can Cashy do it on its own, cheaply and soon, with no famous person or other brand having to cooperate or reply?" },
    { id: "first", name: "First test", question: "Has nobody done this? Would a rival marketer be jealous?" },
    { id: "attribution", name: "Attribution test", question: "Can you retell it without saying Cashy? If yes, it fails." },
  ],
  /**
   * The only hard stops. Offensive, crude, dark and taboo humour, roasting
   * public figures and rivals, and outrage passes with consequences listed.
   */
  redLines: [
    "Taking bets, or pushing sign-ups and deposits, from players in markets where it's illegal. An act that people anywhere can watch is not this: flag the market for legal instead",
    "Anything aimed at or appealing to minors",
    "Hate speech, slurs or content attacking people for race, religion, ethnicity, sexuality, gender, disability or similar. Offensive and taboo is fine; attacking a group is not",
    "Exploiting real tragedies: deaths, disasters, attacks and their victims",
    "Fake quotes, fake endorsements or defamation of real people. Offers made to them, parody, roasting and reacting to their public moments are fine",
    "Fraud, scams or deception that costs people money, or misusing personal data. Harmless pranks and misdirection are fine",
    "Targeting people showing signs of gambling harm, or undermining responsible-gambling protections",
  ],
};

/** Engine 3 content formats, kept only to label retired ideas. */
export const CONTENT_FORMATS: { id: string; name: string }[] = [
  { id: "tiktok-pov", name: "TikTok/Reels POV or skit" },
  { id: "slideshow", name: "TikTok photo slideshow" },
  { id: "meme", name: "Image meme" },
  { id: "x-post", name: "X post or thread" },
  { id: "reply", name: "Reply-guy play" },
  { id: "series", name: "Recurring bit" },
  { id: "clip-edit", name: "Clip, edit or caption" },
  { id: "tiny-build", name: "Tiny build" },
  { id: "creator-seed", name: "Creator seed" },
];

export function formatName(id: string): string {
  return moveName(id);
}
