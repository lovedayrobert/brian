import { USER_AGENT } from "@/lib/adapters/sources/types";
import { readTelegram } from "@/lib/results/channels";
import { repo } from "@/lib/store";

/**
 * How Cashy actually sounds, read from its own website and channels instead of
 * a hand-written brand book (Rob: "just look at our website and socials").
 * Refreshed at most once a day; free, no AI. Brian uses these real samples as
 * its voice reference.
 */
export interface LiveBrand {
  at: string;
  site: { url: string; title: string; description: string; headlines: string[]; lines: string[] };
  telegram: string[];
  xBio?: string;
}

const SITE = () => process.env.BRAND_SITE_URL || "https://cashy.com/";
const clean = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();

let cache: LiveBrand | null = null;

export async function refreshLiveBrand(): Promise<LiveBrand> {
  const html = await (await fetch(SITE(), { headers: { "User-Agent": `Mozilla/5.0 ${USER_AGENT}` }, signal: AbortSignal.timeout(20_000) })).text();
  const pick = (re: RegExp) => [...html.matchAll(re)].map((m) => clean(m[1])).filter((t) => t.length > 2);
  const site = {
    url: SITE(),
    title: clean(html.match(/<title>([^<]*)/)?.[1] ?? ""),
    description: clean(html.match(/name="description" content="([^"]*)/)?.[1] ?? ""),
    headlines: [...new Set(pick(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g))].slice(0, 20),
    lines: [...new Set(pick(/<p[^>]*>([\s\S]*?)<\/p>/g).filter((t) => t.length > 30 && t.length < 300))].slice(0, 15),
  };
  const handle = (process.env.BRIAN_CHANNELS || "telegram:playcashy,x:playcashy").match(/telegram:([\w]+)/)?.[1];
  const xHandle = (process.env.BRIAN_CHANNELS || "telegram:playcashy,x:playcashy").match(/x:([\w]+)/)?.[1];
  const telegram = handle ? (await readTelegram(handle).catch(() => ({ posts: [] as { text: string }[] }))).posts.map((p) => p.text).filter((t) => t.length > 20).slice(-10) : [];
  let xBio: string | undefined;
  if (xHandle) {
    const u = await fetch(`https://api.fxtwitter.com/${xHandle}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15_000) })
      .then((r) => r.json() as Promise<{ user?: { description?: string } }>)
      .catch(() => ({}) as { user?: { description?: string } });
    xBio = u.user?.description;
  }
  const live: LiveBrand = { at: new Date().toISOString(), site, telegram, xBio };
  await repo.update((d) => {
    d.liveBrand = live;
  });
  cache = live;
  return live;
}

/** The latest reading, refreshed if it's over a day old. Never throws: a failed read keeps the last one. */
export async function ensureLiveBrand(): Promise<LiveBrand | null> {
  const stored = cache ?? (await repo.read()).liveBrand ?? null;
  if (stored && Date.now() - new Date(stored.at).getTime() < 86_400_000) return (cache = stored);
  try {
    return await refreshLiveBrand();
  } catch {
    return stored;
  }
}

export function liveBrandContext(live: LiveBrand | null): string {
  if (!live) return "";
  return `<how_cashy_sounds note="Read from Cashy's own website and channels. Match this voice and level of polish. Product facts here are for reference only, never the point of an idea.">
Website (${live.site.url}): ${live.site.title}. ${live.site.description}
Website headlines: ${live.site.headlines.slice(0, 12).join(" | ")}
${live.xBio ? `X bio: ${live.xBio}\n` : ""}Recent posts on our Telegram channel, in our own words:
${live.telegram.map((t) => `- ${t.slice(0, 280)}`).join("\n")}
</how_cashy_sounds>`;
}
