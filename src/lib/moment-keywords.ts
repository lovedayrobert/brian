/**
 * Words that mark a post as being about a moment, for look-back's "only posts
 * about this moment" filter. Lowercase; emoji count. Anything not listed falls
 * back to the words in the moment's own name.
 */
const KEYWORDS: Record<string, string[]> = {
  "4/20": ["420", "4/20", "weed", "blaze", "🌿", "stoner"],
  "April Fools' Day": ["april fool", "prank", "april 1", "fooled", "🤡"],
  "Bitcoin Genesis Block": ["genesis block", "genesis", "block 0", "satoshi", "bitcoin", "btc"],
  "Bitcoin Pizza Day": ["pizza", "🍕", "10,000 btc", "10000 btc", "laszlo", "bitcoin pizza"],
  "Bitcoin whitepaper day": ["whitepaper", "white paper", "satoshi", "bitcoin", "btc"],
  "Black Friday": ["black friday", "deal", "deals", "sale", "discount", "% off", "doorbuster"],
  "Blue Monday": ["blue monday", "saddest day", "monday", "january blues"],
  "Bonfire Night": ["bonfire", "fireworks", "guy fawkes", "🎆", "remember remember"],
  "Boxing Day": ["boxing day", "sale", "leftovers", "boxing"],
  "Christmas Day": ["christmas", "xmas", "santa", "🎄", "🎅", "gift", "presents", "festive"],
  "Christmas Eve": ["christmas eve", "christmas", "xmas", "santa", "🎄", "🎅", "festive"],
  "Cyber Monday": ["cyber monday", "deal", "deals", "sale", "discount", "% off"],
  "Dogecoin's birthday": ["doge", "dogecoin", "🐕", "shiba", "much wow"],
  "Easter Sunday": ["easter", "egg", "eggs", "bunny", "🐰", "🥚"],
  "Ethereum's birthday": ["ethereum", "eth", "vitalik", "birthday"],
  "Father's Day": ["father's day", "fathers day", "dad", "dads", "daddy"],
  "First Bitcoin transaction": ["first transaction", "hal finney", "satoshi", "bitcoin"],
  "Friday the 13th": ["friday the 13th", "unlucky", "13", "jason", "superstition", "🔪"],
  "HODL day": ["hodl", "diamond hands", "💎", "hold"],
  Halloween: ["halloween", "spooky", "spooktober", "pumpkin", "🎃", "👻", "costume", "trick or treat", "trick", "treat", "scary", "witch", "ghost", "haunted", "horror", "creepy"],
  "Kentucky Derby": ["derby", "kentucky", "horse", "🏇", "churchill downs", "run for the roses"],
  "Lunar New Year": ["lunar new year", "chinese new year", "year of the", "🧧", "red envelope"],
  "Mario Day (MAR10)": ["mario", "mar10", "nintendo", "luigi", "🍄"],
  "Mother's Day (UK)": ["mother's day", "mothers day", "mum", "mom", "mums"],
  "Mother's Day (US)": ["mother's day", "mothers day", "mom", "mum", "moms"],
  "National Video Games Day (US)": ["video game", "gaming", "gamer", "gamers", "🎮"],
  "New Year's Day": ["new year", "2025", "2026", "resolution", "resolutions", "🎆"],
  "New Year's Eve": ["new year", "nye", "countdown", "midnight", "🎆", "🥂"],
  "Pi Day": ["pi day", "3.14", "π", "pie"],
  "Pokémon Day": ["pokémon", "pokemon", "pikachu", "pokeball"],
  "Satoshi's stated birthday": ["satoshi", "birthday", "nakamoto"],
  "Singles' Day (11.11)": ["singles day", "11.11", "11/11", "single", "sale"],
  "St Patrick's Day": ["st patrick", "st. patrick", "paddy", "irish", "☘️", "🍀", "leprechaun", "green"],
  "Star Wars Day": ["star wars", "may the 4th", "may the fourth", "jedi", "force"],
  "Super Bowl": ["super bowl", "superbowl", "nfl", "chiefs", "eagles", "touchdown", "🏈", "halftime"],
  "Talk Like a Pirate Day": ["pirate", "arr", "🏴‍☠️", "matey", "ahoy"],
  "The Merge anniversary": ["merge", "ethereum", "proof of stake", "eth"],
  "US Independence Day": ["4th of july", "fourth of july", "july 4", "independence", "🇺🇸", "fireworks"],
  "US Thanksgiving": ["thanksgiving", "turkey", "🦃", "thankful", "grateful"],
  "Valentine's Day": ["valentine", "valentines", "love", "❤️", "💘", "date night", "single"],
  "World Emoji Day": ["emoji", "world emoji day", "😂"],
};

const STOP = new Set(["day", "the", "of", "a", "us", "uk", "s", "and"]);

export function keywordsFor(moment: string): string[] {
  const listed = KEYWORDS[moment];
  if (listed) return listed;
  const words = moment
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/'s\b/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return [...new Set([moment.toLowerCase().replace(/\s*\([^)]*\)/g, "").trim(), ...words])];
}

/** Does this text mention any of the keywords? Case-insensitive; short words must stand alone ("arr" not in "carry"). */
export function mentions(text: string, keywords: string[]): boolean {
  const t = text.toLowerCase();
  return keywords.some((k) => {
    const w = k.toLowerCase();
    if (!/^[a-z0-9]+$/.test(w) || w.length > 4) return t.includes(w);
    return new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(t);
  });
}

const GENERIC = new Set(
  (
    "this that with your have from will just like what when they them their there here more about into than then some been were also only very much make made over time today tonight week weekend every each other right now live join enter win winner winners winning chance comment comments below reply username select selected random randomly correct answer answers giveaway giveaways credit prize prizes dollar usd free bonus play playing games game check stay tuned follow share retweet repost tag friends friend good best great thanks thank everyone " +
    "alongside guess guessing verified verify users user we'll we're you're it's that's don't can't won't let's which where while who whom whose why how would could should must might shall being does doing done going gone getting give given gives take taken takes come comes coming leave leaving left keep kept find found think know knew want wanted need needed look looking see seen show shows still even ever never always again back down after before under above between through during without within across along around first last next another same such those these both either neither most many any all each few less least lots plenty really pretty quite enough everything something anything nothing someone anyone everyone people folks guys year years month months days hours minutes moment moments place thing things ways part kind sort level levels details terms rules apply applies entry entries enter entered tickets ticket chance chances drop drops pick picks picked total amount amounts worth value lucky luck spin spins rain chat chats link links bio below above click here"
  ).split(" "),
);
/** Emoji brands use every day: never a sign of a particular moment. */
const EVERYDAY_EMOJI = new Set([..."✅👀🔥🤑💰💸🚀🎉🙌👇⬇️👉➡️💯😂🤣😍🥳🙏💪✨⚡️🏆🎁💎🤝👏😎🤯😱🫡❗️‼️⏰📢📣🔔🎯💥"].filter((c) => /\p{Extended_Pictographic}/u.test(c)));

/** The words and emoji in a post, once each: lowercase words of 4+ letters (hashtags included), and emoji. */
export function tokens(text: string): Set<string> {
  const t = text.toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/@\w+/g, " ");
  const words = t.match(/[a-z][a-z'’-]{3,}/g) ?? [];
  const emoji = t.match(/\p{Extended_Pictographic}/gu) ?? [];
  return new Set([...words.map((w) => w.replace(/['’]s$/, "")), ...emoji]);
}

/**
 * Words that suddenly appear around a moment: in at least two of the brand's
 * posts from the window, and far more common there than in their posts from
 * the week before. That's how Brian notices "spooktacular" or 🦇 that nobody
 * put on the list. Plain counting, no AI.
 */
export function distinctiveWords(windowTexts: string[], baselineTexts: string[], exclude: string[] = [], max = 8): string[] {
  if (windowTexts.length < 2) return [];
  const skip = new Set(exclude.map((e) => e.toLowerCase()));
  const df = (texts: string[]) => {
    const m = new Map<string, number>();
    for (const t of texts) for (const w of tokens(t)) m.set(w, (m.get(w) ?? 0) + 1);
    return m;
  };
  const inWindow = df(windowTexts);
  const before = df(baselineTexts);
  const nW = windowTexts.length;
  const nB = Math.max(1, baselineTexts.length);
  return [...inWindow.entries()]
    .filter(([w, n]) => n >= 2 && n / nW >= 0.12 && !GENERIC.has(w) && !EVERYDAY_EMOJI.has(w) && !skip.has(w) && ![...skip].some((s) => s.includes(w) || w.includes(s)))
    .map(([w, n]) => ({ w, score: n / nW - (before.get(w) ?? 0) / nB }))
    .filter((x) => x.score >= 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.w);
}

/** A moment's words after the team's edits: the built-in list, plus what they added, minus what they removed. */
export function teamKeywords(moment: string, learned?: { added: string[]; removed: string[] }): string[] {
  const base = keywordsFor(moment).filter((k) => !learned?.removed.includes(k));
  return [...new Set([...base, ...(learned?.added ?? [])])];
}
