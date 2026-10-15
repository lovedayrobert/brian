/**
 * Heuristic relevance to a crypto-casino audience, used when no model key is
 * configured and as a cheap first pass before the model scores the shortlist.
 * Always labelled "heuristic" in the UI.
 */
const CATEGORIES: { id: string; weight: number; re: RegExp }[] = [
  { id: "crypto", weight: 1, re: /\b(bitcoin|btc|ethereum|eth|solana|crypto|token|memecoin|defi|nft|binance|coinbase|stablecoin|airdrop|etf|halving|blockchain|wallet|on-?chain|pump\.fun|doge|pepe)\b/i },
  { id: "gambling", weight: 1, re: /\b(casino|gambl\w*|betting|bet|sportsbook|poker|slots?|blackjack|roulette|jackpot|odds|stake|shuffle|rollbit|roobet|bc\.game|igaming|wager)\b/i },
  { id: "streaming", weight: 0.9, re: /\b(kick|twitch|streamer|stream(ing)?|xqc|adin ross|kai cenat|ishowspeed|speed|mrbeast|youtuber|tiktoker|influencer|podcast)\b/i },
  { id: "gaming", weight: 0.85, re: /\b(gta|grand theft auto|playstation|xbox|nintendo|switch 2|steam|esports?|fortnite|minecraft|roblox|call of duty|valorant|counter-strike|cs2|league of legends|video game|game awards)\b/i },
  { id: "sport", weight: 0.75, re: /\b(ufc|boxing|fight|premier league|champions league|nba|nfl|super bowl|f1|formula 1|grand prix|world cup|transfer|draft|world series|wwe|mma)\b/i },
  { id: "memes", weight: 0.9, re: /\b(memes?|viral|brainrot|skibidi|rizz|sigma|copypasta|tiktok trend)\b/i },
  { id: "markets", weight: 0.7, re: /\b(stock|market crash|nasdaq|s&p|fed|interest rate|polymarket|kalshi|prediction market|recession)\b/i },
  { id: "entertainment", weight: 0.5, re: /\b(film|movie|season \d|series|album|tour|grammy|oscar|emmy|netflix|box office|trailer)\b/i },
  { id: "tech", weight: 0.5, re: /\b(ai|openai|chatgpt|apple|iphone|google|meta|elon|tesla|spacex|outage)\b/i },
  { id: "politics", weight: 0.4, re: /\b(trump|election|president|prime minister|senate|congress|tariff)\b/i },
];

export function classify(text: string): { category: string; relevance: number; matched: string[] } {
  const matched = CATEGORIES.filter((c) => c.re.test(text));
  if (!matched.length) return { category: "culture", relevance: 0.2, matched: [] };
  const top = matched.reduce((a, b) => (b.weight > a.weight ? b : a));
  // More categories hit = more crossover = more relevant, capped at 1.
  const relevance = Math.min(1, top.weight + 0.08 * (matched.length - 1));
  return { category: top.id, relevance: Math.round(relevance * 100) / 100, matched: matched.map((m) => m.id) };
}

/** Token set used to link the same story across sources. */
export function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );
}

export function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n / Math.min(a.size, b.size);
}

const STOP = new Set(
  "the and for with from that this will what when who how are was were has have had not but you your our its into over after before about more than new says said why can all out one two get got just".split(" "),
);
