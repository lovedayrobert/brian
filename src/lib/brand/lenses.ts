/**
 * Opportunity Lab lenses (engine 4). Each is a kind of act that worked for a
 * crypto casino, aimed at a feeling the audience already has. The Inventor
 * reads the Pulse first, so lenses work on what people feel right now.
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
    id: "villain",
    name: "Say what everyone's thinking",
    tagline: "The post people share to agree with.",
    prompt:
      "Find what most people genuinely dislike right now (a person's behaviour, a trend, a company, a habit) and write the post, reply or meme that says what everyone's thinking, so they share it to agree. Never an offer, deal, gift or message to the person: famous people won't notice and nobody cares. People with mixed or loyal audiences don't count. Never anyone involved in real harm to others.",
    examples: ["The reply that gets more likes than the post", "The meme that says it better than anyone"],
  },
  {
    id: "too-far",
    name: "Too far",
    tagline: "So wrong people share it to condemn it.",
    prompt:
      "Find something people would share to complain about while fans share it because it's funny. Love-hate is distribution. Taboo and offensive are allowed; slurs, attacks on groups, minors and real tragedies are not. Learn from why offensive stunts spread; never reuse one.",
    examples: ["A post people quote-tweet to complain about", "A line that splits the timeline in two"],
  },
  {
    id: "everywhere",
    name: "Ride the attention",
    tagline: "Be where people are already looking.",
    prompt:
      "Find where attention is already flowing right now (a moment, a format, a conversation, a feed, a comment section) and the way to put Cashy there so it travels with it. Invent the method; don't reuse one that's been done.",
    examples: ["Showing up inside the thing everyone's already watching", "A way to travel with a moment instead of chasing it"],
  },
  {
    id: "wrong-place",
    name: "Two worlds collide",
    tagline: "Something from one world dropped into another.",
    prompt:
      "Collide two worlds that never meet: take something people know from one place (a game, a sport, an app, a job, a ritual) and drop it into another where it doesn't belong, for real, filmed raw. The collision must be new. No appliances, devices or 'gambling somewhere odd' (done), no game maps in real streets (done).",
    examples: ["Something everyone knows, somewhere it never appears", "A collision people have to see twice"],
  },
  {
    id: "deal-twist",
    name: "Offer with a twist",
    tagline: "A public offer whose terms are the joke.",
    prompt:
      "Invent an offer to our own players or to everyone (not to anyone famous) whose terms are the joke and tied to what people are talking about right now. It must be something Cashy can actually honour within its small budget.",
    examples: ["An offer that is really a joke about this week's story", "Terms people screenshot"],
  },
  {
    id: "main-character",
    name: "Main character of the day",
    tagline: "A real act on whatever everyone's obsessed with today.",
    prompt:
      "Take whoever or whatever the internet is obsessed with right now (the Pulse's main character and the context below) and invent the act Cashy does on it today: something real, done fast, that becomes part of the story.",
    examples: ["Becoming part of today's story", "The move everyone wishes they'd made"],
  },
  {
    id: "rival-raid",
    name: "Rival raid",
    tagline: "Steal a rival's players, streamers or moment in public.",
    prompt:
      "Invent a cheeky public raid on a rival (Stake, Shuffle, Rollbit, Roobet, BC.Game, Duel, Rainbet): their bad news, their streamers, their fans, their moments, the way Housebets read rivals' wallets. No false claims about them.",
    examples: ["Turning a rival's bad week into Cashy's", "An offer only a rival's fans can claim"],
  },
  {
    id: "schadenfreude",
    name: "Laugh at the fall",
    tagline: "Mark someone's public failure so everyone enjoys it together.",
    prompt:
      "Find a public fall people are enjoying right now (a rival, a public figure, a brand, a coin) and invent the act that lets everyone enjoy it together. Never real tragedies, never private people.",
    examples: ["The act that crowns someone's worst week", "A memorial for something nobody misses"],
  },
  {
    id: "blank-page",
    name: "Blank page",
    tagline: "Read the room. Find the act.",
    prompt: "No lens. Read the pulse and find the 10 acts most likely to get shared because of how people feel right now.",
    examples: ["Anything that passes the panel"],
  },
];

export function lensById(id: string): Lens | undefined {
  return LENSES.find((l) => l.id === id);
}
