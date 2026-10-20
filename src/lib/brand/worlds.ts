/**
 * The worlds Cashy's audience lives in. Ideas and the Pulse are spread across
 * them so one loud world (streamers, usually) can't take over (Rob, 20 Oct:
 * "there is so much focus on streamers, too much").
 */
export const WORLDS = ["streaming", "sport", "crypto", "gaming", "internet", "news", "money", "celebrity"] as const;
export type World = (typeof WORLDS)[number];

export const WORLD_HINT =
  "streaming = streamers and their drama; sport = athletes, teams, refs, betting on games; crypto = coins, rugs, crypto people; gaming = games and gamers; internet = viral clips, memes, main characters, AI; news = politics, odd local stories; money = scams, debt, lotteries, wins; celebrity = famous people outside streaming";

/** Keeps at most `limit(world)` items from each world, in order. */
export function capByWorld<T>(items: T[], world: (t: T) => string | undefined, limit: (w: string) => number): T[] {
  const seen = new Map<string, number>();
  return items.filter((t) => {
    const w = world(t) ?? "other";
    seen.set(w, (seen.get(w) ?? 0) + 1);
    return seen.get(w)! <= limit(w);
  });
}
