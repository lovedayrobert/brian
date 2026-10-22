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
