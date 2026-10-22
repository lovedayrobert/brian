"use client";

import clsx from "clsx";
import { Check, Eye, Heart, Loader2, MessageCircle, Play, Repeat2, Search, X } from "lucide-react";
import { keywordsFor } from "@/lib/moment-keywords";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Media = { kind: "photo" | "video" | "gif"; url: string };
type Post = { id: string; url: string; text: string; at: string; likes?: number; reposts?: number; replies?: number; views?: number; via: "twitterapi" | "x" | "wayback"; media: Media[]; author?: { name: string; avatar?: string } };
type Result = { handle: string; from: string; to: string; posts: Post[]; routes: { name: string; ok: boolean; note: string }[]; xSearchUrl: string; costUsd: number };
type Moment = { title: string; date: string };

const VIA = { twitterapi: "Full history", x: "X", wayback: "Archive" } as const;
const n = (v?: number) => (v === undefined ? "–" : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(v));
const shift = (d: string, days: number) => new Date(Date.parse(`${d}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const nice = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const field = "h-11 w-full rounded-full bg-surface-3 px-4 text-[14.5px] outline-none placeholder:text-ink-3 focus:bg-surface focus:shadow-card";

/** Type to find a moment: every word you type has to appear in "Halloween 2024 Oct". */
function useMomentSearch(moments: Moment[], q: string) {
  return useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const month = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" }).toLowerCase();
    return moments
      .filter((m) => {
        const hay = `${m.title} ${m.date.slice(0, 4)} ${month(m.date)}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [moments, q]);
}

/**
 * "What did this brand do on this day?" Pick a brand, find a moment by typing,
 * see their posts from around it as real posts, pick the ones that worked and
 * teach them to Brian in one go.
 */
export function LookBack({ moments, brands, paid, ai }: { moments: Moment[]; brands: string[]; paid: "history" | "recent" | "none"; ai: boolean }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [q, setQ] = useState("");
  const [moment, setMoment] = useState<Moment | null>(null);
  const [cursor, setCursor] = useState(0);
  const [focus, setFocus] = useState(false);
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [teaching, setTeaching] = useState<string | null>(null);
  const [onlyAbout, setOnlyAbout] = useState(true);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [adding, setAdding] = useState("");
  const matches = useMomentSearch(moments, q);

  const window = custom ?? (moment ? { from: shift(moment.date, -4), to: shift(moment.date, 3) } : null);
  const choose = (m: Moment) => {
    setMoment(m);
    setKeywords(keywordsFor(m.title));
    setQ(`${m.title} ${m.date.slice(0, 4)}`);
    setFocus(false);
  };

  async function look(allowPaid: boolean) {
    if (!window) return setError("Find a moment, or set your own dates.");
    setBusy(true);
    setError(null);
    setResult(null);
    setPicked(new Set());
    const res = await fetch("/api/brain/lookback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle, ...window, allowPaid, keywords: onlyAbout ? keywords : [] }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Couldn't look that up.");
    setResult(json);
  }

  async function teach() {
    if (!result) return;
    const posts = result.posts.filter((p) => picked.has(p.id));
    const event = !custom && moment ? `${moment.title} ${moment.date.slice(0, 4)}` : undefined;
    for (let i = 0; i < posts.length; i++) {
      setTeaching(`Teaching ${i + 1} of ${posts.length}…`);
      const res = await fetch("/api/brain/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: posts[i].url, event, why: `Picked from @${result.handle}'s posts ${event ? `around ${event}` : `from ${result.from} to ${result.to}`}.` }),
      });
      if (!res.ok) {
        setTeaching(null);
        return setError((await res.json().catch(() => ({}))).error ?? "Brian couldn't take that one.");
      }
    }
    setTeaching(null);
    setPicked(new Set());
    router.refresh();
  }

  return (
    <div className="text-left">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Brand on X</label>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@stake" className={field} />
          {brands.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {brands.map((b) => (
                <button key={b} onClick={() => setHandle(`@${b}`)} className={clsx("rounded-full px-2.5 py-1 text-[12px] transition", handle.replace(/^@/, "").toLowerCase() === b.toLowerCase() ? "bg-ink text-bg" : "bg-surface-3 text-ink-2 hover:text-ink")}>
                  @{b}
                </button>
              ))}
            </div>
          )}
        </div>
        {!custom ? (
          <div className="relative">
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Moment</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setMoment(null);
                  setCursor(0);
                  setFocus(true);
                }}
                onFocus={() => setFocus(true)}
                onBlur={() => setTimeout(() => setFocus(false), 120)}
                onKeyDown={(e) => {
                  if (!matches.length) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(matches.length - 1, c + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(0, c - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    choose(matches[cursor]);
                  }
                }}
                placeholder="Halloween 2024, Black Friday, GTA…"
                className={clsx(field, "pl-10")}
              />
            </div>
            {focus && q.trim() && !moment && (
              <div className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-[14px] bg-surface p-1 shadow-float">
                {matches.length === 0 ? (
                  <p className="px-3 py-2.5 text-[13px] text-ink-3">No moment called that. Set your own dates below.</p>
                ) : (
                  matches.map((m, i) => (
                    <button
                      key={`${m.title}${m.date}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(m)}
                      className={clsx("flex w-full items-baseline justify-between gap-3 rounded-[10px] px-3 py-2 text-left text-[14px]", i === cursor ? "bg-surface-3" : "hover:bg-surface-2")}
                    >
                      <span className="font-medium">
                        {m.title} {m.date.slice(0, 4)}
                      </span>
                      <span className="text-[12.5px] text-ink-3">{nice(m.date)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">From</label>
              <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">To</label>
              <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className={field} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] text-ink-3">
        <span>{window ? `${nice(window.from)} to ${nice(window.to)}` : "Type a moment and pick it from the list"}</span>
        <button onClick={() => setCustom(custom ? null : { from: window?.from ?? "", to: window?.to ?? "" })} className="text-accent-ink hover:underline">
          {custom ? "Search for a moment instead" : "Set my own dates"}
        </button>
      </div>

      <div className="mt-5 rounded-[16px] bg-surface-2 p-4">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-[13.5px] font-medium">
            Only posts about {moment && !custom ? moment.title : "these words"}
            <span className="block text-[12.5px] font-normal text-ink-3">{onlyAbout ? "Posts must mention one of the words below." : "Showing everything they posted in those dates."}</span>
          </span>
          <span className={clsx("relative h-6 w-10 shrink-0 rounded-full transition", onlyAbout ? "bg-accent" : "bg-line-strong")}>
            <input type="checkbox" checked={onlyAbout} onChange={() => setOnlyAbout(!onlyAbout)} className="absolute inset-0 cursor-pointer opacity-0" />
            <span className={clsx("pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", onlyAbout ? "left-[18px]" : "left-0.5")} />
          </span>
        </label>
        {onlyAbout && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {keywords.map((k) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[12.5px] shadow-card">
                {k}
                <button aria-label={`Remove ${k}`} onClick={() => setKeywords(keywords.filter((x) => x !== k))} className="text-ink-3 hover:text-ink">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === ",") && adding.trim()) {
                  e.preventDefault();
                  const w = adding.trim().toLowerCase();
                  if (!keywords.includes(w)) setKeywords([...keywords, w]);
                  setAdding("");
                }
              }}
              placeholder={keywords.length ? "Add a word…" : "Type a word and press Enter"}
              className="h-7 min-w-[150px] flex-1 rounded-full bg-transparent px-2 text-[12.5px] outline-none placeholder:text-ink-3"
            />
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {paid !== "none" && (
          <button disabled={busy || !handle.trim() || !window} onClick={() => look(true)} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-bg hover:opacity-90 disabled:opacity-40">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Looking…" : paid === "history" ? "Look (about $0.01)" : "Look (up to $0.20 of X budget)"}
          </button>
        )}
        <button disabled={busy || !handle.trim() || !window} onClick={() => look(false)} className="h-10 rounded-full bg-surface px-5 text-[14px] font-medium shadow-card hover:shadow-raised disabled:opacity-40">
          {paid === "none" ? (busy ? "Looking…" : "Look") : "Free archive only"}
        </button>
      </div>
      {error && <p className="mt-3 text-[13.5px] text-bad">{error}</p>}

      {result && (
        <div className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-[14px] text-ink-2">
              <span className="font-semibold text-ink">{result.posts.length} posts</span> from @{result.handle}, best first{result.costUsd ? ` · cost $${result.costUsd.toFixed(3)}` : " · free"}
            </p>
            <a href={result.xSearchUrl} target="_blank" rel="noreferrer" className="text-[13px] text-accent-ink hover:underline">
              Search this on X ↗
            </a>
          </div>
          <p className="mt-1 text-[12.5px] text-ink-3">{result.routes.map((r) => `${r.ok ? "✓" : "–"} ${r.name}: ${r.note}`).join(" · ")}</p>
          {result.posts.length === 0 && (
            <p className="mt-6 rounded-[16px] bg-surface-2 p-5 text-[14.5px] text-ink-2">Nothing reachable from here. Open the search on X (free while you&rsquo;re logged in) and paste the best posts into Teach.</p>
          )}
          <div className="mt-5 columns-1 gap-4 sm:columns-2">
            {result.posts.map((p) => (
              <PostCard
                key={p.id}
                p={p}
                handle={result.handle}
                picked={picked.has(p.id)}
                onPick={() => {
                  const next = new Set(picked);
                  if (next.has(p.id)) next.delete(p.id);
                  else next.add(p.id);
                  setPicked(next);
                }}
              />
            ))}
          </div>
          {picked.size > 0 && (
            <div className="sticky bottom-4 mt-4 flex flex-wrap items-center gap-4 rounded-full bg-surface py-2 pl-2 pr-5 shadow-float">
              <button disabled={!!teaching || !ai} onClick={teach} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-bg disabled:opacity-40">
                {teaching && <Loader2 className="h-4 w-4 animate-spin" />}
                {teaching ?? `Teach Brian ${picked.size === 1 ? "this post" : `these ${picked.size} posts`}`}
              </button>
              <span className="text-[13px] text-ink-3">About ${(picked.size * 0.04).toFixed(2)}. He digests each into his brain.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One post, looking like a post: who, when, words, picture, numbers. */
function PostCard({ p, handle, picked, onPick }: { p: Post; handle: string; picked: boolean; onPick: () => void }) {
  const img = p.media[0];
  return (
    <article className={clsx("mb-4 break-inside-avoid overflow-hidden rounded-[18px] bg-surface shadow-card transition", picked && "ring-2 ring-accent")}>
      <div className="flex items-center gap-3 px-4 pt-4">
        {p.author?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.author.avatar} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-3 text-[13px] font-semibold text-ink-2">{handle[0]?.toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[14px] font-semibold">{p.author?.name ?? handle}</div>
          <div className="truncate text-[12.5px] text-ink-3">
            @{handle} · {new Date(p.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>
        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] text-ink-3">{VIA[p.via]}</span>
      </div>
      {p.text && <p className="line-clamp-6 whitespace-pre-line px-4 pt-3 text-[14.5px] leading-relaxed">{p.text}</p>}
      {img && (
        <a href={p.url} target="_blank" rel="noreferrer" className="relative mx-4 mt-3 block overflow-hidden rounded-[14px] bg-surface-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="" loading="lazy" referrerPolicy="no-referrer" className="max-h-[420px] w-full object-cover" />
          {img.kind !== "photo" && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11.5px] font-medium text-white">
              <Play className="h-3 w-3 fill-white" /> {img.kind === "gif" ? "GIF" : "Video"}
            </span>
          )}
          {p.media.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[11.5px] font-medium text-white">+{p.media.length - 1}</span>}
        </a>
      )}
      <div className="flex items-center gap-4 px-4 pb-4 pt-3 text-[12.5px] text-ink-2">
        <span className="inline-flex items-center gap-1" title="Views">
          <Eye className="h-3.5 w-3.5" /> {n(p.views)}
        </span>
        <span className="inline-flex items-center gap-1" title="Likes">
          <Heart className="h-3.5 w-3.5" /> {n(p.likes)}
        </span>
        <span className="inline-flex items-center gap-1" title="Reposts">
          <Repeat2 className="h-3.5 w-3.5" /> {n(p.reposts)}
        </span>
        <span className="inline-flex items-center gap-1" title="Replies">
          <MessageCircle className="h-3.5 w-3.5" /> {n(p.replies)}
        </span>
        <a href={p.url} target="_blank" rel="noreferrer" className="ml-auto text-accent-ink hover:underline">
          Open
        </a>
        <button onClick={onPick} className={clsx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12.5px] font-medium transition", picked ? "bg-accent text-white" : "bg-surface-3 text-ink hover:bg-accent-soft")}>
          {picked && <Check className="h-3.5 w-3.5" />}
          {picked ? "Picked" : "Teach"}
        </button>
      </div>
    </article>
  );
}
