/**
 * Opportunity Lab lenses. Trends are one source of ideas; these are the
 * others. Each lens is a content format a small social team can make this
 * week (engine 3). None of them is about Cashy's product; Cashy is the
 * account posting the joke, not the subject of it.
 *
 * Platform rules still apply: nothing disguises gambling promotion to get
 * past them. That loses accounts, and Red Lines flags it.
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
    name: "Ride what's happening",
    tagline: "The joke everyone's thinking about today, posted first.",
    prompt:
      "Take something the internet is talking about right now (in the context below) and write the post, meme, reply or quick video Cashy's account puts out today. The obvious-but-unsaid joke, said flatly and early. No campaign, no stunt: content that's live in an hour.",
    examples: ["The reply that gets more likes than the post", "A meme of the moment with Cashy's watermark"],
  },
  {
    id: "pov-skits",
    name: "POV and skits",
    tagline: "Phone-shot TikToks about the moments everyone recognises.",
    prompt:
      "Write TikTok/Reels POVs and short skits (7-20 seconds, one or two people, a phone, a trending sound or a voiceover) about moments people who gamble, trade crypto or watch streams instantly recognise: the 'last spin', the friend who's always up, the 3am bonus buy, the chat when the slot does nothing. Relatable first, Cashy second.",
    examples: ["POV: you said 'last game' 40 minutes ago", "Types of people in a casino Discord at 2am"],
  },
  {
    id: "memes",
    name: "Memes and slideshows",
    tagline: "Image memes and TikTok photo slideshows, made in Canva in an hour.",
    prompt:
      "Write image memes in formats people already use, and TikTok photo slideshows (3-8 slides, one line each) that tell a tiny relatable story or list. Lo-fi on purpose. Cashy posts them and they get seeded to meme pages.",
    examples: ["A slideshow ranking excuses for being online at 4am", "A known meme template with a degen caption"],
  },
  {
    id: "shitposts",
    name: "Shitposts and replies",
    tagline: "X posts and replies in the account's voice.",
    prompt:
      "Write X posts and reply-guy plays for Cashy's account: deadpan one-liners, fake-serious announcements of nothing, obviously fake screenshots, and the reply you'd drop under the day's biggest streamer, crypto or sports post. The account's personality is the product.",
    examples: ["A deadpan one-liner that becomes a quote-tweet template", "The reply under a viral post that steals the thread"],
  },
  {
    id: "series",
    name: "A recurring bit",
    tagline: "A fixed format people come back for.",
    prompt:
      "Invent a recurring bit Cashy can post on a schedule for weeks: a 'Day N of…' series, a weekly ranking, a recurring character or a fixed template the audience starts to expect and quote. Write the first three episodes.",
    examples: ["'Day 1 of…' with a running joke", "A weekly 'worst decision of the week' ranking"],
  },
  {
    id: "clips",
    name: "Clips and edits",
    tagline: "Recut and caption what's already funny.",
    prompt:
      "Find content in clips and edits: captioned stream moments, remixed old meme videos with Cashy on them (the way Stake put its logo in legacy memes), game clips with a degen caption, edits on trending sounds. The source material is already funny; the caption makes it relatable. Never imply a real person endorses Cashy.",
    examples: ["An old meme video recut with a Cashy watermark", "A stream clip with one perfect line of text on top"],
  },
  {
    id: "tiny-builds",
    name: "Tiny builds",
    tagline: "Vibe-coded sites, toys and bots that do one dumb thing.",
    prompt:
      "Invent a tiny thing Cashy can vibe-code in a day or two that people play with and share: a one-joke website, a generator, a calculator, a filter, a Discord or Telegram bot, a browser game. It must be fun with no gambling involved and carry Cashy's name in the corner. Look at what people are building and sharing right now (the builds below) and find the version our audience would send to friends. Say exactly what happens when you open it and what people screenshot.",
    examples: ["A website that does one stupid thing perfectly", "A generator people screenshot and post"],
  },
  {
    id: "calendar",
    name: "Big moment, prepared",
    tagline: "Content ready for a moment everyone can see coming.",
    prompt:
      "Take one of the upcoming moments provided (GTA 6, holidays, big fights, launches) and write the posts, memes, videos or tiny build Cashy has ready on the day. Simple content, prepared ahead, posted in the first hour. React to the moment; never pretend to be an official partner, and avoid trademarks in the creative.",
    examples: ["The launch-day post set, written weeks ahead", "A meme that works whatever happens"],
  },
  {
    id: "blank-page",
    name: "Blank page",
    tagline: "No starting point. Just views.",
    prompt: "No lens. Write the 10 pieces of content most likely to get Cashy's account views and sends this week, for almost no money.",
    examples: ["Anything that passes the tests"],
  },
];

export function lensById(id: string): Lens | undefined {
  return LENSES.find((l) => l.id === id);
}
