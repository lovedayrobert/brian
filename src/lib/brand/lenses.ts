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
    name: "Aim at the villain",
    tagline: "Something for the people sick of whoever everyone's sick of.",
    prompt:
      "Only use someone most people genuinely dislike right now (the Pulse shows how people feel). People with mixed or loyal audiences are not villains: skip them. If nobody fits, give fewer ideas. Usually the right move is a sharp post or reply that says what everyone's thinking; a real act (like Shuffle paying Jack Doherty to stop posting) only when the dislike is huge. It must land even if the person ignores it. Never anyone involved in real harm to others (crashes, assaults, deaths).",
    examples: ["The post everyone wishes they'd made about them", "A small real act that gives the haters what they want"],
  },
  {
    id: "too-far",
    name: "Too far",
    tagline: "So wrong people share it to condemn it.",
    prompt:
      "Invent an act that is offensive, wrong or taboo enough that people share it to complain while fans share it because it's funny, the way Duel's blackjack host costume did. Love-hate is distribution. Taboo and offensive are allowed; slurs, attacks on groups, minors and real tragedies are not.",
    examples: ["The thing a casino should never do, done", "A game nobody should have made"],
  },
  {
    id: "everywhere",
    name: "Be everywhere",
    tagline: "Put Cashy's name where attention already is.",
    prompt:
      "Invent a way to put Cashy's name inside the things people already watch and share, at a scale nobody else bothers with, the way Stake put its logo on legacy viral meme videos. The distribution mechanism is the idea: clips, memes, game lobbies, streams, usernames, comment sections, anything with built-in reach.",
    examples: ["A logo on everything people already repost", "A name hidden somewhere millions look"],
  },
  {
    id: "wrong-place",
    name: "Wrong place",
    tagline: "The casino thing somewhere it absolutely shouldn't be.",
    prompt:
      "Invent a real moment of playing Cashy, or putting Cashy, somewhere absurd: a device, a place or a screen nobody would think could run a casino, filmed raw on a phone, like the guy gambling on a kitchen-store fridge. It has to genuinely work, and nobody can have done it.",
    examples: ["Gambling on a device that has no business running a casino", "A screen in a place nobody expects"],
  },
  {
    id: "deal-twist",
    name: "Deal with a twist",
    tagline: "Terms that are the punchline.",
    prompt:
      "Invent a contract, payment, sponsorship or offer whose terms are the joke and the headline: an odd clause, an odd payment, an odd condition, offered publicly to someone the audience has feelings about. Frame real people as the target of an offer, never as having agreed.",
    examples: ["A clause everyone screenshots", "An offer someone has to answer in public"],
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
