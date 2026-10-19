import { CALENDAR } from "@/lib/brand/calendar";

/**
 * Special days the marketing calendar fills in automatically: holidays,
 * crypto anniversaries, internet and gaming days, betting fixtures, and
 * Friday the 13ths. Fixed dates are certain; movable ones are computed from
 * their rule, and anything not fixed by law or tradition says to check.
 * Add a day by adding a line. Nothing here costs anything.
 */
export type DayKind = "holiday" | "crypto" | "internet" | "gaming" | "sport" | "shopping" | "cashy";

export interface SpecialDay {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  kind: DayKind;
  why: string;
  check?: string;
}

type Rule = { title: string; kind: DayKind; why: string; check?: string; at: (y: number) => Date | null };

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));
const fixed = (m: number, day: number) => (y: number) => d(y, m, day);
/** n-th weekday (0 = Sunday) of a month; n = -1 for the last. */
function nth(y: number, m: number, weekday: number, n: number): Date {
  if (n > 0) {
    const first = d(y, m, 1);
    return d(y, m, 1 + ((weekday - first.getUTCDay() + 7) % 7) + (n - 1) * 7);
  }
  const last = d(y, m + 1, 0);
  return d(y, m, last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7));
}
/** Gregorian Easter Sunday (anonymous algorithm). */
function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - dd - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return d(y, month, day);
}
const plus = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
const LUNAR_NEW_YEAR: Record<number, string> = { 2026: "2026-02-17", 2027: "2027-02-06", 2028: "2028-01-26" };

const RULES: Rule[] = [
  // Holidays
  { title: "New Year's Day", kind: "holiday", why: "Resolutions, hangovers and 'new year, same degen' energy.", at: fixed(1, 1) },
  { title: "Blue Monday", kind: "holiday", why: "'The most depressing day of the year', a made-up PR day everyone still talks about.", at: (y) => nth(y, 1, 1, 3) },
  { title: "Valentine's Day", kind: "holiday", why: "Couples content and the much bigger anti-Valentine's crowd.", at: fixed(2, 14) },
  { title: "St Patrick's Day", kind: "holiday", why: "Luck is literally the theme.", at: fixed(3, 17) },
  { title: "April Fools' Day", kind: "internet", why: "The one day a fake announcement is expected. Everyone's trying, so it has to be good.", at: fixed(4, 1) },
  { title: "Easter Sunday", kind: "holiday", why: "Long weekend, family time, chocolate.", at: easter },
  { title: "Mother's Day (UK)", kind: "holiday", why: "UK Mothering Sunday.", at: (y) => plus(easter(y), -21) },
  { title: "Mother's Day (US)", kind: "holiday", why: "US and most of the world.", at: (y) => nth(y, 5, 0, 2) },
  { title: "Father's Day", kind: "holiday", why: "Dads, grills, and dads who think they're up overall.", at: (y) => nth(y, 6, 0, 3) },
  { title: "US Independence Day", kind: "holiday", why: "Fireworks, patriotism, long weekend.", at: fixed(7, 4) },
  { title: "Halloween", kind: "holiday", why: "Costumes and horror. The biggest meme day of the autumn.", at: fixed(10, 31) },
  { title: "Bonfire Night", kind: "holiday", why: "UK fireworks night.", at: fixed(11, 5) },
  { title: "US Thanksgiving", kind: "holiday", why: "NFL triple-header and a long weekend online.", at: (y) => nth(y, 11, 4, 4) },
  { title: "Christmas Eve", kind: "holiday", why: "Last-minute everything.", at: fixed(12, 24) },
  { title: "Christmas Day", kind: "holiday", why: "Peak family time; peak boredom online by the afternoon.", at: fixed(12, 25) },
  { title: "Boxing Day", kind: "holiday", why: "UK football and sales; everyone's on their phone.", at: fixed(12, 26) },
  { title: "New Year's Eve", kind: "holiday", why: "Countdowns and the most predictable posts of the year.", at: fixed(12, 31) },
  { title: "Lunar New Year", kind: "holiday", why: "Huge across Asia; luck and red envelopes.", at: (y) => (LUNAR_NEW_YEAR[y] ? new Date(`${LUNAR_NEW_YEAR[y]}T00:00:00Z`) : null) },
  // Shopping
  { title: "Black Friday", kind: "shopping", why: "Every brand shouts deals. The parody opportunity of the year.", at: (y) => plus(nth(y, 11, 4, 4), 1) },
  { title: "Cyber Monday", kind: "shopping", why: "Black Friday, round two.", at: (y) => plus(nth(y, 11, 4, 4), 4) },
  { title: "Singles' Day (11.11)", kind: "shopping", why: "The world's biggest shopping day, born as an anti-Valentine's.", at: fixed(11, 11) },
  // Crypto
  { title: "Bitcoin Genesis Block", kind: "crypto", why: "Block 0 was mined on 3 January 2009. Bitcoin's birthday.", at: fixed(1, 3) },
  { title: "First Bitcoin transaction", kind: "crypto", why: "Satoshi sent Hal Finney 10 BTC on 12 January 2009.", at: fixed(1, 12) },
  { title: "Satoshi's stated birthday", kind: "crypto", why: "5 April, as given on Satoshi Nakamoto's P2P Foundation profile.", at: fixed(4, 5) },
  { title: "Bitcoin Pizza Day", kind: "crypto", why: "22 May 2010: 10,000 BTC for two pizzas. Crypto's favourite 'what if' story.", at: fixed(5, 22) },
  { title: "Ethereum's birthday", kind: "crypto", why: "Mainnet launched 30 July 2015.", at: fixed(7, 30) },
  { title: "The Merge anniversary", kind: "crypto", why: "Ethereum moved to proof of stake on 15 September 2022.", at: fixed(9, 15) },
  { title: "Bitcoin whitepaper day", kind: "crypto", why: "Satoshi published the whitepaper on 31 October 2008. Same day as Halloween.", at: fixed(10, 31) },
  { title: "Dogecoin's birthday", kind: "crypto", why: "Launched 6 December 2013 as a joke. Still here.", at: fixed(12, 6) },
  { title: "HODL day", kind: "crypto", why: "The 'I AM HODLING' typo post, 18 December 2013. Birth of a meme.", at: fixed(12, 18) },
  // Internet and gaming
  { title: "Pokémon Day", kind: "gaming", why: "Pokémon Red and Green launched 27 February 1996.", at: fixed(2, 27) },
  { title: "Mario Day (MAR10)", kind: "gaming", why: "Nintendo's own pun day.", at: fixed(3, 10) },
  { title: "Pi Day", kind: "internet", why: "3.14. Nerd day with built-in jokes.", at: fixed(3, 14) },
  { title: "4/20", kind: "internet", why: "Stoner holiday. Edgy, huge online.", at: fixed(4, 20) },
  { title: "Star Wars Day", kind: "internet", why: "May the 4th be with you.", at: fixed(5, 4) },
  { title: "World Emoji Day", kind: "internet", why: "17 July, the date shown on the calendar emoji.", at: fixed(7, 17) },
  { title: "National Video Games Day (US)", kind: "gaming", why: "Unofficial US gaming day.", check: "Unofficial; some calendars use 8 July instead.", at: fixed(9, 12) },
  { title: "Talk Like a Pirate Day", kind: "internet", why: "A real day people actually do.", at: fixed(9, 19) },
  // Sport and betting
  { title: "Super Bowl", kind: "sport", why: "The biggest betting day in the US.", check: "Expected on the second Sunday in February; confirm with the NFL.", at: (y) => nth(y, 2, 0, 2) },
  { title: "Kentucky Derby", kind: "sport", why: "'The most exciting two minutes in sports'. Big betting day.", check: "Traditionally the first Saturday in May; confirm.", at: (y) => nth(y, 5, 6, 1) },
];

/** Friday the 13ths: made for a casino. */
function friday13s(y: number): SpecialDay[] {
  const out: SpecialDay[] = [];
  for (let m = 1; m <= 12; m++) {
    const date = d(y, m, 13);
    if (date.getUTCDay() === 5)
      out.push({ id: `day_f13_${y}_${m}`, date: iso(date), title: "Friday the 13th", kind: "internet", why: "Unlucky day. A casino talking about luck writes itself." });
  }
  return out;
}

const iso = (date: Date) => date.toISOString().slice(0, 10);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Every special day between two dates (inclusive), sorted. */
export function specialDays(from: string, to: string): SpecialDay[] {
  const y0 = Number(from.slice(0, 4)), y1 = Number(to.slice(0, 4));
  const out: SpecialDay[] = [];
  for (let y = y0; y <= y1; y++) {
    for (const r of RULES) {
      const date = r.at(y);
      if (!date) continue;
      out.push({ id: `day_${slug(r.title)}_${y}`, date: iso(date), title: r.title, kind: r.kind, why: r.why, check: r.check });
    }
    out.push(...friday13s(y));
  }
  // One-off dated moments from the culture calendar (e.g. GTA 6).
  for (const m of CALENDAR) {
    if (!/^cal_(gta6)/.test(m.id)) continue;
    out.push({ id: `day_${m.id}`, date: m.date.slice(0, 10), title: m.title, kind: "gaming", why: m.description, check: m.dateNote });
  }
  return out.filter((x) => x.date >= from && x.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export function specialDayById(id: string): SpecialDay | undefined {
  const m = id.match(/_(\d{4})(?:_\d+)?$/);
  const y = m ? Number(m[1]) : new Date().getUTCFullYear();
  return specialDays(`${y}-01-01`, `${y}-12-31`).find((x) => x.id === id) ?? specialDays(`${y - 1}-01-01`, `${y + 1}-12-31`).find((x) => x.id === id);
}
