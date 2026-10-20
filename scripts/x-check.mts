// One small X read to check the connection: 10 posts (about $0.05). Usage: npx tsx scripts/x-check.mts
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { xSearch } = await import("@/lib/integrations/x");
const { watchlists } = await import("@/lib/adapters/sources/x");
const l = watchlists()[0];
const q = `(${l.handles.map((h) => `from:${h}`).join(" OR ")}) -is:retweet -is:reply`;
try {
  const posts = await xSearch(q, 10, "recency");
  console.log(`OK: ${posts.length} posts from the ${l.name} watchlist`);
  const seen = new Set(posts.map((p) => p.author.toLowerCase()));
  console.log("Handles that posted:", [...seen].join(", ") || "none", "| silent or wrong:", l.handles.filter((h) => !seen.has(h.toLowerCase())).join(", "));
  for (const p of posts.slice(0, 5)) console.log(` @${p.author}: ${p.text.replace(/\s+/g, " ").slice(0, 90)} | ${p.likes} likes${p.views ? `, ${p.views} views` : ""}`);
} catch (e) {
  console.log("FAILED:", (e as Error).message);
}
