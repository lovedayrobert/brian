import type { Citation } from "@/lib/domain/types";

/**
 * The idea quality bar, humour guide and content formats, plus the competitor stunt library (brief §3c). These are the
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
 * Engine 3. Rob's verdict on engine 2: "too AI and cheesy, way too gimmicky.
 * No one is doing these big wild stupid campaigns." Ideas are now pieces of
 * content a small social team can make this week, in the formats and humour
 * the audience already uses. The references below are simple content that
 * got views, not award-show stunts.
 */
export const REFERENCE_CONTENT: { who: string; what: string; why: string }[] = [
  { who: "Stake", what: "Dropped its logo into old viral meme videos and let them recirculate.", why: "Zero production. The meme does the work; the logo rides along on every repost." },
  { who: "Ryanair (TikTok)", what: "Phone-shot clips of a plane with a face, roasting its own passengers with whatever sound is trending.", why: "Lo-fi, self-aware and on a trending sound. It says what customers already joke about." },
  { who: "Duolingo (TikTok, before the 'funeral')", what: "A person in a cheap owl costume doing unhinged little skits on trending sounds, posted almost daily.", why: "A recurring character and a fixed format. Cheap, fast, and in the platform's own language." },
  { who: "Wendy's (X)", what: "Short, rude replies to people and rival brands.", why: "Reply-guy humour from a brand account. Every roast is a screenshot." },
  { who: "Scrub Daddy (TikTok)", what: "Daily low-effort skits and replies to comments, filmed on a phone.", why: "Volume and consistency in native formats beat one big production." },
  { who: "Crypto Twitter shitposters", what: "Deadpan one-liners, fake screenshots of obviously fake things, 'me after my 4th leveraged long' memes.", why: "Relatable pain, said flatly. People repost what describes them." },
  { who: "Vibe-coded one-day websites", what: "Tiny sites and toys built in an afternoon with AI that do one dumb thing well (a timer, a calculator, a generator, a browser game) and get passed around on X and TikTok.", why: "One joke, instantly usable, shareable as a link or a screen recording. Costs a weekend." },
  { who: "Kick and Twitch clip accounts", what: "Captioned 10-second clips of streamers losing it, reposted with one line of text on top.", why: "The clip is already funny; the caption makes it relatable. Nothing to produce." },
];

/**
 * What a piece of content actually is. Every idea is one of these, made by one
 * or two people with a phone, CapCut, Canva, an image model or a weekend of
 * vibe coding.
 */
export const CONTENT_FORMATS: { id: string; name: string; how: string }[] = [
  { id: "tiktok-pov", name: "TikTok/Reels POV or skit", how: "Phone-shot, one person, 7-20 seconds, a trending sound or a voiceover. 'POV: …' or a two-character bit. Hook in the first second." },
  { id: "slideshow", name: "TikTok photo slideshow", how: "3-8 images with one line of text each, telling a tiny story or a list. The format TikTok pushes hardest right now." },
  { id: "meme", name: "Image meme", how: "A known template or a screenshot format with our caption. Posted on our accounts and seeded to meme pages." },
  { id: "x-post", name: "X post or thread", how: "A single deadpan post in the account's voice: a one-liner, a fake screenshot, a 'nobody: / me:' style bit." },
  { id: "reply", name: "Reply-guy play", how: "Replying under the big post of the day (a streamer, a crypto account, a viral tweet) with the funniest line in the replies, from Cashy's account." },
  { id: "series", name: "Recurring bit", how: "A fixed format posted on a schedule ('Day 14 of…', a weekly ranking, a character) so people come back for the next one." },
  { id: "clip-edit", name: "Clip, edit or caption", how: "Recut, caption or remix something already funny (a stream moment, an old meme video, a game clip) with Cashy on it." },
  { id: "tiny-build", name: "Tiny build", how: "A vibe-coded website, generator, filter, bot or browser game that does one dumb thing. Built in a day or two, shared as a link or a screen recording." },
  { id: "creator-seed", name: "Creator seed", how: "Hand a small creator or streamer a bit, a sound or a template to run with, for a small fee or free. Not a sponsorship deal." },
];

/**
 * The humour the audience actually uses. Written as registers and real-feeling
 * examples so the Inventor writes in them rather than about them.
 */
export const HUMOUR_GUIDE = {
  registers: [
    "Deadpan: say the absurd thing flatly, with no exclamation marks and no wink. The less it tries, the funnier it is.",
    "Relatable degen pain: the 4am loss, the parlay that died on the last leg, the 'just one more', the friend who always says he's up. People repost what describes them.",
    "Self-aware brand: the account knows it's a casino account and jokes about it. Never defensive, never selling.",
    "Absurdist and brainrot: non-sequiturs, escalating nonsense, internet-native references (rizz, aura, NPC, 'it's giving', 'we are so back', 'it's so over'). Use them because they fit, not to prove we know them.",
    "Irony and fake seriousness: treating something stupid with total corporate or documentary seriousness.",
    "Lo-fi on purpose: phone camera, bad crop, default TikTok font, MS Paint arrows. Polish reads as an ad and gets skipped.",
    "Crypto Twitter and streamer in-jokes: the rug, the bags, 'few understand', the chat spamming W or L, the streamer's face when the slot does nothing.",
  ],
  sounds_like: [
    "POV: you said 'last game' 40 minutes ago",
    "me explaining to my girlfriend why the 14-leg parlay was actually a smart investment",
    "nobody: / the slot after I said 'last spin': [clip]",
    "day 31 of pretending I understand what my friend's memecoin does",
    "every crypto guy's portfolio is just 4 screenshots and a prayer",
    "slideshow: 'types of people at 2am in a casino discord' (6 slides, one line each)",
    "a website where you enter how much you lost and it tells you what you could have bought instead, in increasingly stupid items",
  ],
  cringe: [
    "Pun names and campaign titles ('Cash-tastic', 'The Great Cashy Heist', 'Operation …', 'Project …'). Name it by what it is.",
    "Press-release energy: 'world's first', 'groundbreaking', 'disrupting', 'the internet will go crazy', 'unleash', 'epic', 'iconic'.",
    "Fellow-kids slang stuffed in to sound young ('no cap fr fr this bonus is bussin').",
    "Explaining the joke, or a caption that says 'we did a funny'.",
    "Mascots or execs doing pranks, flash mobs, stunts in a costume in public.",
    "Anything with a press conference, a launch event, an auction, a billboard, a giant object, naming rights or a sponsorship.",
    "Fake products, limited drops and merch as the idea.",
    "Big 'what if Cashy…' hypotheticals that would need lawyers, partners or a budget.",
    "Polished, lit, agency-looking creative. If it looks like an ad, it gets skipped like one.",
    "Words AI reaches for: 'chaos', 'unhinged' used as a selling point, 'the ultimate', 'legendary', 'next level', 'game-changer', 'meet …', 'introducing …'.",
  ],
};

export const QUALITY_BAR = {
  traits: [
    "It's a piece of content, not a campaign: a post, a video, a slideshow, a meme, a reply, a series or a tiny build. You can describe exactly what's on screen.",
    "Makeable this week by one or two people with a phone, CapCut, Canva, an image model or a weekend of vibe coding. No partners, no lawyers, no events, no budget beyond a few hundred dollars.",
    "It gets views on its own: the hook works in the first second or the first line, with zero ad spend.",
    "It's funny the way the audience is funny: deadpan, relatable, self-aware, absurd. It looks like something a real person or a good meme account would post.",
    "People send it to the group chat or tag a friend: 'this is literally you'.",
    "Cashy is the account posting it, the watermark, or a small part of the bit. Never the point, never a sales message.",
    "Repeatable is a bonus: a format that can run as a series beats a one-off.",
  ],
  banned: [
    "Anything whose point is Cashy's product or strengths: payouts, withdrawal speed, wagering, bonuses, games, transparency, trust, fairness, the Justice Fund or AskGamblers",
    "Big IRL stunts: billboards, giant objects, flash mobs, vehicles, public events, anything in a physical place",
    "Purchases and deals: sponsorships, naming rights, buying things, auctions, celebrity or streamer contracts, brand collabs that need negotiating",
    "Fake products, product launches, limited drops, merch and 'parody brands' as the idea",
    "Press-bait stunts whose only audience is journalists, or ideas that need press coverage to work",
    "Comparisons with rivals' terms, exposés of how casinos treat players, or 'switch to us' offers",
    "Dashboards, trackers, indexes, leaderboards and data pages",
    "Challenges, polls, giveaways, tournaments and renamed promotions",
    "Anything that takes more than a week or a couple of thousand dollars to make",
    "Anything on the cringe list",
  ],
  tests: [
    { id: "group-chat", name: "Group-chat test", question: "Would a 19-25 year old who's online all day send this to the group chat or tag a friend, without knowing it's from a brand?" },
    { id: "hook", name: "Hook test", question: "Does the first second of the video, or the first line of the post, stop the scroll on its own? Quote the hook." },
    { id: "native", name: "Native test", question: "Does it look and sound like something a real person or a good meme account would post, not an ad, not an agency and not an AI? Any pun name, press-release phrase or cringe-list item fails it." },
    { id: "makeable", name: "Makeable test", question: "Can one or two people make it this week with a phone, CapCut, Canva, an image model or a quick vibe-coded build, for a few hundred dollars at most?" },
    { id: "attribution", name: "Attribution test", question: "Is it funny with no logo, and does Cashy's name still travel with it (posting account, watermark, a small part of the bit)?" },
  ],
  /**
   * The only hard stops. Everything else (offensive, crude or dark humour,
   * roasting rivals and public figures, taboo topics) passes with its
   * consequences spelled out.
   */
  redLines: [
    "Taking bets, or pushing sign-ups and deposits, from players in markets where it's illegal. Content that people anywhere can watch is not this: flag the market for legal instead",
    "Anything aimed at or appealing to minors",
    "Hate speech, slurs or content attacking people for race, religion, ethnicity, sexuality, gender, disability or similar. Edgy and offensive humour is fine; hate is not",
    "Exploiting real tragedies: deaths, disasters, attacks and their victims",
    "Fake quotes, fake endorsements or defamation of real people. Parody, roasting and reacting to their public moments are fine",
    "Fraud, scams or deception that costs people money, or misusing personal data. Harmless pranks and misdirection are fine",
    "Targeting people showing signs of gambling harm, or undermining responsible-gambling protections",
  ],
};

export function formatName(id: string): string {
  return CONTENT_FORMATS.find((f) => f.id === id)?.name ?? id;
}
