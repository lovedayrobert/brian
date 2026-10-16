import { XMLParser } from "fast-xml-parser";
import { sleep, USER_AGENT } from "./types";

/**
 * Reddit's public RSS (the JSON API is blocked without auth). Ranked by score,
 * so position stands in for attention. Every Reddit request in the process
 * goes through one queue with a pause between, because Reddit rate-limits
 * back-to-back requests and two sources share it.
 */
export interface RedditPost {
  title: string;
  url: string;
  text: string;
  published?: string;
  thumbnail?: string;
  rank: number;
}

type Entry = {
  title?: string;
  link?: { "@href"?: string };
  published?: string;
  content?: string | { "#text": string };
  "media:thumbnail"?: { "@url"?: string };
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });
let queue: Promise<unknown> = Promise.resolve();

export function redditTop(sub: string, t: "day" | "week", limit = 25): Promise<RedditPost[]> {
  const run = queue.then(async () => {
    const get = () =>
      fetch(`https://www.reddit.com/r/${sub}/top/.rss?t=${t}&limit=${limit}`, {
        headers: { "User-Agent": `Mozilla/5.0 ${USER_AGENT}` },
        signal: AbortSignal.timeout(20_000),
      });
    let res = await get();
    if (res.status === 429) {
      await sleep(15_000);
      res = await get();
    }
    await sleep(7_000); // unauthenticated RSS allows roughly one request every few seconds
    if (!res.ok) throw new Error(`${res.status}`);
    const entries: Entry[] = [parser.parse(await res.text())?.feed?.entry ?? []].flat();
    return entries.flatMap((e, rank): RedditPost[] => {
      const title = e.title?.trim();
      const url = e.link?.["@href"];
      if (!title || !url) return [];
      const text = (stripHtml(typeof e.content === "object" ? e.content["#text"] : e.content) ?? "").replace(/submitted by .*$/i, "").trim();
      return [{ title, url, text, published: e.published, thumbnail: e["media:thumbnail"]?.["@url"], rank: rank + 1 }];
    });
  });
  queue = run.catch(() => undefined);
  return run;
}

export function stripHtml(s?: string): string | undefined {
  if (!s) return undefined;
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#32;/g, " ")
    .replace(/\[link\]|\[comments\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
