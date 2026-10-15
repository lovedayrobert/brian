import type { Signal } from "@/lib/domain/types";
import { getJson, sleep, type SourceAdapter } from "./types";

/**
 * The trenches: pump.fun coins with the most trading activity right now.
 * Memecoin launchers name coins after whatever the internet is laughing at,
 * often within minutes, so coin names are an early read on what's catching.
 *
 * Volume: GeckoTerminal's public API (pump.fun bonding curve + PumpSwap).
 * Descriptions and socials: DexScreener's public API.
 * pump.fun's own frontend API is undocumented, so it isn't used.
 *
 * Volume is easy to fake and most coins collapse within hours. Brian ranks by
 * recent activity and unique buyers, drops coins that are already dead, and
 * treats every coin as a culture signal, never something to promote.
 */
const GT = "https://api.geckoterminal.com/api/v2/networks/solana/dexes";

interface Pool {
  id: string;
  attributes: {
    name: string;
    pool_created_at: string;
    fdv_usd: string | null;
    price_change_percentage: Record<string, string>;
    volume_usd: Record<string, string>;
    transactions: Record<string, { buys: number; sells: number; buyers: number; sellers: number }>;
  };
  relationships: { base_token: { data: { id: string } } };
}
interface Token {
  id: string;
  attributes: { address: string; name: string; symbol: string; image_url: string | null };
}
interface Profile {
  tokenAddress: string;
  chainId: string;
  description?: string;
  url?: string;
  links?: { type?: string; label?: string; url: string }[];
}

export interface CoinStats {
  address: string;
  name: string;
  symbol: string;
  volume1h: number;
  volume6h: number;
  volume24h: number;
  buyers1h: number;
  buyers24h: number;
  change24h: number;
  fdv: number;
  ageHours: number;
  dex: "pump.fun" | "PumpSwap";
  status: "live" | "dying";
}

/** Activity score: recent volume matters most, unique buyers keep wash trading honest. */
export function trenchScore(c: Pick<CoinStats, "volume1h" | "volume6h" | "buyers1h" | "buyers24h">): number {
  return Math.log10(1 + c.volume1h) * 2 + Math.log10(1 + c.volume6h) + Math.log10(1 + c.buyers1h) * 2 + Math.log10(1 + c.buyers24h);
}

export function isDying(c: Pick<CoinStats, "change24h" | "buyers1h" | "volume1h">): boolean {
  return c.change24h <= -85 || c.buyers1h === 0 || c.volume1h < 500;
}

export const trenches: SourceAdapter = {
  id: "trenches",
  ready: () => true,
  async fetchSignals({ now, log }) {
    const coins = new Map<string, CoinStats>();
    const images = new Map<string, string>();
    for (const [dex, label] of [
      ["pumpswap", "PumpSwap"],
      ["pump-fun", "pump.fun"],
    ] as const) {
      for (const page of [1, 2]) {
        try {
          const res = await getJson<{ data: Pool[]; included?: Token[] }>(
            `${GT}/${dex}/pools?sort=h24_volume_usd_desc&page=${page}&include=base_token`,
          );
          const tokens = new Map((res.included ?? []).map((t) => [t.id, t.attributes]));
          for (const p of res.data) {
            const tok = tokens.get(p.relationships.base_token.data.id);
            if (!tok) continue;
            const a = p.attributes;
            const n = (k: string) => Number(a.volume_usd[k] ?? 0);
            const tx = (k: string) => a.transactions[k] ?? { buyers: 0 };
            const existing = coins.get(tok.address);
            const stats: CoinStats = {
              address: tok.address,
              name: tok.name,
              symbol: tok.symbol,
              volume1h: n("h1") + (existing?.volume1h ?? 0),
              volume6h: n("h6") + (existing?.volume6h ?? 0),
              volume24h: n("h24") + (existing?.volume24h ?? 0),
              buyers1h: Math.max(tx("h1").buyers, existing?.buyers1h ?? 0),
              buyers24h: Math.max(tx("h24").buyers, existing?.buyers24h ?? 0),
              change24h: Number(a.price_change_percentage.h24 ?? 0),
              fdv: Number(a.fdv_usd ?? 0),
              ageHours: Math.round((now.getTime() - new Date(a.pool_created_at).getTime()) / 3_600_000),
              dex: label,
              status: "live",
            };
            stats.status = isDying(stats) ? "dying" : "live";
            coins.set(tok.address, stats);
            if (tok.image_url) images.set(tok.address, tok.image_url);
          }
        } catch (e) {
          log(`GeckoTerminal ${dex} p${page}: ${(e as Error).message}`);
        }
        await sleep(2_200); // free tier: 30 calls a minute
      }
    }

    // Descriptions: the meme or narrative behind the coin, when the creator wrote one.
    const profiles = new Map<string, Profile>();
    for (const url of ["https://api.dexscreener.com/token-profiles/latest/v1", "https://api.dexscreener.com/token-boosts/top/v1"]) {
      try {
        const list = await getJson<Profile[]>(url);
        for (const p of list) if (p.chainId === "solana") profiles.set(p.tokenAddress, p);
      } catch (e) {
        log(`DexScreener: ${(e as Error).message}`);
      }
    }

    return [...coins.values()]
      // The trenches are new coins; established tokens (like $PUMP itself) aren't a signal.
      .filter((c) => c.status === "live" && c.ageHours <= 72)
      .sort((a, b) => trenchScore(b) - trenchScore(a))
      .slice(0, 40)
      .map((c): Signal => {
        const prof = profiles.get(c.address);
        const x = prof?.links?.find((l) => l.type === "twitter")?.url;
        return {
          id: `trenches:${c.address}`,
          sourceId: "trenches",
          url: `https://dexscreener.com/solana/${c.address}`,
          title: `${c.name} ($${c.symbol})`,
          summary: prof?.description?.slice(0, 400),
          imageUrl: images.get(c.address),
          metric: { label: "Volume, last 6h (USD)", value: Math.round(c.volume6h) },
          topics: ["memecoin", c.dex],
          coin: { ...c, x },
          capturedAt: now.toISOString(),
          publishedAt: new Date(now.getTime() - c.ageHours * 3_600_000).toISOString(),
        };
      });
  },
};
