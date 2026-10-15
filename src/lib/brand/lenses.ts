/**
 * Opportunity Lab lenses. Trends are one source of ideas; these are the
 * others. Each lens is a different way of finding an opening that is Cashy's
 * own: from what we have, what rivals get wrong, where a casino can still earn
 * attention, and what only crypto makes possible.
 *
 * "Without being restricted" means finding channels and formats where a
 * casino is allowed, or where nobody has thought to look. It never means
 * disguising gambling promotion to get past platform rules: that loses
 * accounts, and Red Lines flags it.
 */
export interface Lens {
  id: string;
  name: string;
  tagline: string;
  prompt: string;
  examples: string[];
}

export const LENSES: Lens[] = [
  {
    id: "advantages",
    name: "Unfair advantages",
    tagline: "Turn what we genuinely have into something people can't ignore.",
    prompt:
      "Start from one of Cashy's real advantages (withdrawals under 4 minutes, zero wagering, no win cap, provably fair originals, on-chain payment proof, the Justice Fund, the AskGamblers partnership). Find a stunt that proves it publicly in a way people screenshot, rather than a claim in an ad. The proof itself should be the content.",
    examples: ["A public, live proof that does the bragging for us", "A dare to rivals that only we can win"],
  },
  {
    id: "product-as-media",
    name: "Product as media",
    tagline: "Features and mechanics that are the marketing.",
    prompt:
      "Invent a product feature, game mechanic, page or tool whose existence is the story. It should be shareable on its own, make sense only for a crypto casino, and be cheap to build. Think in terms of what a player would screenshot or send to a friend, not what a banner would say.",
    examples: ["A feature press would write about on launch day", "A mechanic that turns players into distribution"],
  },
  {
    id: "rival-weak-spots",
    name: "Rival weak spots",
    tagline: "What players hate about other casinos, used against them.",
    prompt:
      "Find what players complain about at rival crypto casinos (wagering traps, win caps, slow or frozen withdrawals, KYC surprises, VIP favouritism, broken promises) using the evidence provided. Invent a rival-baiting play that makes Cashy the obvious answer without defaming anyone: stick to verifiable facts and public complaints.",
    examples: ["A switch offer only we can afford to make", "A stunt that turns a rival's bad week into our good one"],
  },
  {
    id: "open-channels",
    name: "Channels we can use",
    tagline: "Where a casino can still earn attention.",
    prompt:
      "Paid ads on Meta, Google and TikTok are largely closed to offshore crypto casinos. Find attention in places that are open or overlooked: Kick and streamer culture, X organic, Telegram, Discord, podcasts, sponsorships (esports, fighters, creators), IRL stunts in permissive markets, prediction-market and on-chain culture, PR-able data releases, partnerships with non-gambling brands that want edge. The channel choice should be part of the idea. Note which markets each would need checking in.",
    examples: ["An unexpected partner that gets both brands talked about", "A format native to a channel rivals ignore"],
  },
  {
    id: "crypto-native",
    name: "Crypto-native plays",
    tagline: "Ideas that only work on-chain.",
    prompt:
      "Invent something that uses public on-chain data, wallets, tokens, the trenches, proof-of-reserves or smart contracts in a way no traditional casino could. Housebets reading rival deposits from wallets is the benchmark. Respect privacy law: wallet-level targeting must be opt-in or aggregate, and say what needs a legal check.",
    examples: ["A data play using public chain data", "Something the memecoin trenches would pick up on their own"],
  },
  {
    id: "deals",
    name: "Deals and contracts",
    tagline: "The headline is in the deal itself.",
    prompt:
      "Invent an unusual deal: a sponsorship, signing, contract clause, acquisition of something odd, bounty or public offer whose structure is the story. Shuffle signing a streamer to a deal that stopped him posting is the benchmark. Never imply a real person has agreed to anything: frame people as targets of an offer, not participants.",
    examples: ["A contract clause that becomes the headline", "A public offer someone has to respond to"],
  },
  {
    id: "calendar",
    name: "Calendar ambush",
    tagline: "Own a moment everyone can see coming.",
    prompt:
      "Take one of the upcoming moments provided (GTA 6, big fights, crypto events, launches) and invent the stunt Cashy should have ready on the day, with a twist that makes it ours rather than another brand's congratulations post. Avoid official sponsorship claims and trademarks; react to the moment, don't pretend to be part of it.",
    examples: ["A launch-day stunt prepared weeks ahead", "An ambush that works whoever wins"],
  },
  {
    id: "blank-page",
    name: "Blank page",
    tagline: "No starting point. Just the quality bar.",
    prompt:
      "No trend, no lens. Invent the most talked-about thing a crypto casino could do in the next 30 days for under $50k, using only the quality bar, the stunt library and what Cashy genuinely has.",
    examples: ["Anything that passes the five tests"],
  },
];

export function lensById(id: string): Lens | undefined {
  return LENSES.find((l) => l.id === id);
}
