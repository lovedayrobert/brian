/**
 * Opportunity Lab lenses. Trends are one source of ideas; these are the
 * others. Each lens is an attention mechanic: a different way of getting
 * Cashy in front of people so they share it. None of them is about Cashy's
 * product; the brand is behind the stunt, not the subject of it.
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
    id: "hijack-now",
    name: "Hijack what's happening",
    tagline: "Get Cashy's name into the thing everyone's watching today.",
    prompt:
      "Take something the internet is talking about right now (in the context below) and find the fastest, funniest way to insert Cashy into it so it gets shared with the moment. Think Oreo in the blackout, not a brand congratulating anyone. Speed and the obvious-but-unsaid joke win.",
    examples: ["The post everyone wishes they'd made first", "A reaction so quick it becomes part of the story"],
  },
  {
    id: "irl-stunt",
    name: "Absurd real-world stunt",
    tagline: "Something physical, filmed, and impossible not to share.",
    prompt:
      "Invent a physical stunt in the real world that is absurd enough to be filmed on phones and posted everywhere: an object, a billboard, a vehicle, a place, a public act. It has to be cheap relative to the attention, legal in a permissive market, and obviously Cashy's.",
    examples: ["A giant object in the wrong place", "A billboard that becomes the story"],
  },
  {
    id: "collab",
    name: "Unexpected collab",
    tagline: "A partner nobody would expect a casino to touch.",
    prompt:
      "Invent a collaboration with a brand, artist, creator, community or institution that nobody would expect next to a crypto casino, where the pairing itself is the joke or the shock. Frame real people and brands as targets of an offer or a collaboration we'd pitch, never as already agreed.",
    examples: ["A pairing that makes people say 'wait, what?'", "Merch from a collab that sells out on irony"],
  },
  {
    id: "parody-product",
    name: "Parody product or drop",
    tagline: "A ridiculous thing that exists only to be talked about.",
    prompt:
      "Invent a product, drop, merch item or fake launch that is ridiculous, limited and instantly memeable, the way MSCHF or Liquid Death would. The product is the joke and Cashy's name is on it.",
    examples: ["Merch people buy as a meme", "A fake product announcement people want to be real"],
  },
  {
    id: "troll",
    name: "Troll the timeline",
    tagline: "Cheeky public bait that people pick sides on.",
    prompt:
      "Invent a public troll of a rival, an industry norm, a platform or a cultural moment that people will screenshot and pick sides on. Cheeky, never defamatory: no false claims about anyone, no implied endorsements. Ryanair's self-roasting and Burger King's Whopper Detour are the tone.",
    examples: ["A post rivals can't reply to without losing", "Bait that the comments finish for you"],
  },
  {
    id: "internet-object",
    name: "Internet-native object",
    tagline: "A bot, filter, game, site or coin people play with and share.",
    prompt:
      "Invent something people use and share online: a bot, an AI toy, a filter, a browser game, a ridiculous website, a generator, an Easter egg or a culture coin moment. It must be fun with no casino involvement at all, and carry Cashy's name everywhere it travels.",
    examples: ["A toy that goes viral on its own", "Something people send to friends to mess with them"],
  },
  {
    id: "buy-something",
    name: "Buy something ridiculous",
    tagline: "Naming rights, absurd sponsorships, objects the internet cares about.",
    prompt:
      "Invent a purchase or sponsorship whose absurdity is the headline: naming rights to something nobody would name, sponsoring something tiny or strange, buying an object, domain or piece of internet history. The deal itself is the content.",
    examples: ["A sponsorship nobody saw coming", "Buying something the internet already argues about"],
  },
  {
    id: "creator-chaos",
    name: "Creator chaos",
    tagline: "A streamer or creator deal so strange the deal is the content.",
    prompt:
      "Invent a creator, streamer or athlete deal with a twist so strange that the deal itself goes viral: odd clauses, odd payments, odd conditions. Shuffle paying a streamer not to post and Kick's mega-signings are the benchmark. Never imply a real person has agreed: frame them as the target of an offer.",
    examples: ["A clause that becomes the headline", "An offer someone has to respond to publicly"],
  },
  {
    id: "calendar",
    name: "Calendar ambush",
    tagline: "Own a moment everyone can see coming.",
    prompt:
      "Take one of the upcoming moments provided (GTA 6, big fights, launches, crypto events) and invent the stunt Cashy should have ready on the day so its name rides the moment. React to it, don't pretend to be an official partner, and avoid trademarks in the creative.",
    examples: ["A launch-day stunt prepared weeks ahead", "An ambush that works whoever wins"],
  },
  {
    id: "blank-page",
    name: "Blank page",
    tagline: "No starting point. Just shares and impressions.",
    prompt:
      "No lens. Invent the most shared thing a crypto casino brand could do in the next 30 days for under $50k. Pure attention.",
    examples: ["Anything that passes the five tests"],
  },
];

export function lensById(id: string): Lens | undefined {
  return LENSES.find((l) => l.id === id);
}
