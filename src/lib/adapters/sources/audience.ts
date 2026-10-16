import type { Signal } from "@/lib/domain/types";
import { redditTop } from "./reddit";
import type { SourceAdapter } from "./types";

/**
 * What the audience itself is consuming today, from the communities it lives
 * in: streamer clips and drama, Kick, gambling and betting, crypto, and the
 * cringe and wtf content people pass around. Feeds the Pulse, which reads why
 * people are watching (hate, outrage, wtf, love…). Free and keyless.
 */
export const AUDIENCE_SUBS: { name: string; scene: string }[] = [
  { name: "LivestreamFail", scene: "streamer clips and drama" },
  { name: "KickStreaming", scene: "Kick" },
  { name: "TikTokCringe", scene: "viral TikToks, cringe and wtf" },
  { name: "wallstreetbets", scene: "degen trading, loss porn" },
  { name: "sportsbook", scene: "betting, bad beats" },
  { name: "CryptoCurrency", scene: "crypto" },
  { name: "memes", scene: "mainstream memes" },
  { name: "therewasanattempt", scene: "public fails" },
];

export const audience: SourceAdapter = {
  id: "audience",
  ready: () => true,
  async fetchSignals({ now, log }) {
    const out: Signal[] = [];
    for (const sub of AUDIENCE_SUBS) {
      try {
        for (const p of (await redditTop(sub.name, "day")).slice(0, 15)) {
          out.push({
            id: `audience:${p.url}`,
            sourceId: "audience",
            url: p.url,
            title: p.title,
            summary: p.text.slice(0, 300) || undefined,
            author: `r/${sub.name}`,
            imageUrl: p.thumbnail,
            metric: { label: `Rank in r/${sub.name} today`, value: p.rank },
            topics: ["audience", sub.scene],
            capturedAt: now.toISOString(),
            publishedAt: p.published,
          });
        }
      } catch (e) {
        log(`r/${sub.name}: ${(e as Error).message}`);
      }
    }
    return out;
  },
};
