"use client";

import clsx from "clsx";
import { Check, ChevronDown, Eye, Heart, Loader2, MessageCircle, Play, Plus, Repeat2, Search, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { relativeTime } from "@/lib/format";
import { mentions, teamKeywords, tokens } from "@/lib/moment-keywords";
import type { WeekContext } from "@/lib/week-context";

type Media = { kind: "photo" | "video" | "gif"; url: string };
type Post = { id: string; url: string; text: string; at: string; likes?: number; reposts?: number; replies?: number; views?: number; via: "twitterapi" | "x" | "wayback"; media: Media[]; author?: { name: string; avatar?: string } };
type Result = { handle: string; from: string; to: string; posts: Post[]; others: Post[]; suggested: string[]; routes: { name: string; ok: boolean; note: string }[]; xSearchUrl: string; costUsd: number; reused?: boolean; at?: string; label?: string; paid?: boolean; keywords?: string[] };
export type Research = { id: string; at: string; byName: string; label: string; handle: string; from: string; to: string; count: number; others: number };
type Moment = { title: string; date: string };
type Learned = Record<string, { added: string[]; removed: string[] }>;

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

/** Save the team's change to a moment's words, for everyone, next time. */
function remember(moment: string, change: { add?: string[]; remove?: string[] }) {
  fetch("/api/brain/moment-keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moment, ...change }) }).catch(() => {});
}

/**
 * "What did this brand do on this day?" Pick a brand and a moment; Brian
 * already knows the words that mark a post as being about it, shows the
 * posts that are, keeps the rest one click away, and points out words
 * nobody listed. Nothing to type.
 */
export function LookBack({
  moments,
  brands,
  learned: learnedAtStart,
  paid,
  ai,
  campaignId,
  presetMoment,
  history = [],
}: {
  moments: Moment[];
  brands: string[];
  learned: Learned;
  paid: "history" | "recent" | "none";
  ai: boolean;
  /** Teach into this campaign's Brian rather than the main Brian */
  campaignId?: string;
  /** The campaign's recurring moment: its past years become one-click picks */
  presetMoment?: string;
  /** Looks the team has already run: reopen them for free */
  history?: Research[];
}) {
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
  const [learned, setLearned] = useState<Learned>(learnedAtStart);
  const [adding, setAdding] = useState<string | null>(null);
  const [showOthers, setShowOthers] = useState(false);
  const [week, setWeek] = useState<WeekContext | "loading" | null>(null);
  // Only moments that have happened: there's nothing to look back at for Halloween 2026 yet.
  const past = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return moments.filter((m) => m.date <= today);
  }, [moments]);
  const matches = useMomentSearch(past, q);
  const quick = presetMoment ? past.filter((m) => m.title === presetMoment).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4) : [];

  const window = custom ?? (moment ? { from: shift(moment.date, -4), to: shift(moment.date, 3) } : null);
  // The moments the words come from: the one picked, or any that fall inside your own dates.
  const sources = useMemo(() => {
    if (moment && !custom) return [moment.title];
    if (custom?.from && custom.to) return [...new Set(moments.filter((m) => m.date >= shift(custom.from, -3) && m.date <= shift(custom.to, 3)).map((m) => m.title))];
    return [];
  }, [moment, custom, moments]);
  const keywords = useMemo(() => [...new Set(sources.flatMap((t) => teamKeywords(t, learned[t])))], [sources, learned]);
  const editable = sources.length === 1 ? sources[0] : null;

  const change = (word: string, kind: "add" | "remove") => {
    if (!editable) return;
    const w = word.trim().toLowerCase();
    if (!w) return;
    const cur = learned[editable] ?? { added: [], removed: [] };
    const next =
      kind === "add"
        ? { added: cur.added.includes(w) ? cur.added : [...cur.added, w], removed: cur.removed.filter((x) => x !== w) }
        : { added: cur.added.filter((x) => x !== w), removed: cur.added.includes(w) || cur.removed.includes(w) ? cur.removed : [...cur.removed, w] };
    setLearned({ ...learned, [editable]: next });
    remember(editable, kind === "add" ? { add: [w] } : { remove: [w] });
    // Adding a word Brian spotted pulls the posts that use it into the results straight away.
    if (kind === "add" && result) {
      const moved = result.others.filter((p) => mentions(p.text, [w]));
      if (moved.length) setResult({ ...result, posts: [...result.posts, ...moved], others: result.others.filter((p) => !moved.includes(p)), suggested: result.suggested.filter((x) => x !== w) });
      else setResult({ ...result, suggested: result.suggested.filter((x) => x !== w) });
    }
  };

  const choose = (m: Moment) => {
    setMoment(m);
    setQ(`${m.title} ${m.date.slice(0, 4)}`);
    setFocus(false);
  };

  // What else was happening that week loads alongside the brand's posts (cached after the first time, so free).
  const loadWeek = (w: { from: string; to: string }) => {
    setWeek("loading");
    fetch("/api/brain/week", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(w) })
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => setWeek(x))
      .catch(() => setWeek(null));
  };

  /** Reopen earlier research for free: the posts, the week, and the brand and moment it was for. */
  async function reopen(r: Research) {
    setBusy(true);
    setError(null);
    setPicked(new Set());
    setShowOthers(false);
    const res = await fetch(`/api/brain/lookback/${r.id}`);
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Couldn't open that research.");
    setHandle(`@${json.handle}`);
    const m = moments.find((x) => `${x.title} ${x.date.slice(0, 4)}` === json.label);
    if (m) {
      setCustom(null);
      choose(m);
    } else setCustom({ from: json.from, to: json.to });
    setResult(json);
    loadWeek({ from: json.from, to: json.to });
  }

  async function look(allowPaid: boolean, fresh = false) {
    if (!window) return setError("Find a moment, or set your own dates.");
    loadWeek(window);
    setBusy(true);
    setError(null);
    setResult(null);
    setPicked(new Set());
    setShowOthers(false);
    const res = await fetch("/api/brain/lookback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        handle,
        ...window,
        allowPaid,
        fresh,
        keywords: onlyAbout ? keywords : [],
        moment: sources.join(" and ") || undefined,
        label: !custom && moment ? `${moment.title} ${moment.date.slice(0, 4)}` : undefined,
        campaignId,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Couldn't look that up.");
    setResult(json);
    router.refresh();
  }

  async function teach() {
    if (!result) return;
    const all = [...result.posts, ...result.others];
    const posts = all.filter((p) => picked.has(p.id));
    const event = !custom && moment ? `${moment.title} ${moment.date.slice(0, 4)}` : undefined;
    // A post the words missed teaches the list too: the words Brian spotted in it are kept for this moment.
    for (const p of result.others.filter((x) => picked.has(x.id))) {
      const words = tokens(p.text);
      for (const w of result.suggested.filter((x) => words.has(x))) change(w, "add");
    }
    for (let i = 0; i < posts.length; i++) {
      setTeaching(`Teaching ${i + 1} of ${posts.length}…`);
      const res = await fetch("/api/brain/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: posts[i].url,
          event,
          why: `Picked from @${result.handle}'s posts ${event ? `around ${event}` : `from ${result.from} to ${result.to}`}.`,
          context: week && week !== "loading" ? weekLine(week) : undefined,
          campaignId,
        }),
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

  const pick = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  return (
    <div className="text-left">
      {history.length > 0 && (
        <div className="mb-6 rounded-[16px] bg-surface-2 p-4">
          <p className="text-[13.5px] font-medium">Your research</p>
          <p className="text-[12px] text-ink-3">Looks the team has already run. Reopen any of them for free.</p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {history.slice(0, 12).map((r) => (
              <li key={r.id}>
                <button onClick={() => reopen(r)} disabled={busy} className="rounded-full bg-surface px-3 py-1.5 text-left text-[12.5px] shadow-card hover:shadow-raised disabled:opacity-50" title={`${r.count} posts, ${r.others} others · ${r.byName} · ${relativeTime(r.at)}`}>
                  <span className="font-medium">@{r.handle}</span> · {r.label} <span className="text-ink-3">· {r.count} posts · {relativeTime(r.at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
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
          <div className="self-start">
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Moment</label>
            {quick.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {quick.map((m) => (
                  <button key={m.date} onClick={() => choose(m)} className={clsx("rounded-full px-2.5 py-1 text-[12px] transition", moment?.date === m.date ? "bg-ink text-bg" : "bg-surface-3 text-ink-2 hover:text-ink")}>
                    {m.title} {m.date.slice(0, 4)}
                  </button>
                ))}
              </div>
            )}
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

      {window && (
        <div className="mt-5 rounded-[16px] bg-surface-2 p-4">
          {keywords.length ? (
            <>
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-[13.5px] font-medium">
                  Only posts about {sources.join(" and ")}
                  <span className="block text-[12.5px] font-normal text-ink-3">{onlyAbout ? "Brian knows the words these posts use. Tap a word to drop it." : "Showing everything they posted in those dates."}</span>
                </span>
                <span className={clsx("relative h-6 w-10 shrink-0 rounded-full transition", onlyAbout ? "bg-accent" : "bg-line-strong")}>
                  <input type="checkbox" checked={onlyAbout} onChange={() => setOnlyAbout(!onlyAbout)} className="absolute inset-0 cursor-pointer opacity-0" />
                  <span className={clsx("pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", onlyAbout ? "left-[18px]" : "left-0.5")} />
                </span>
              </label>
              {onlyAbout && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {keywords.map((k) => (
                    <button key={k} disabled={!editable} onClick={() => change(k, "remove")} className="group inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[12.5px] shadow-card enabled:hover:text-bad" title={editable ? "Drop this word" : undefined}>
                      {k}
                      {editable && <X className="h-3 w-3 text-ink-3 group-hover:text-bad" />}
                    </button>
                  ))}
                  {editable &&
                    (adding === null ? (
                      <button onClick={() => setAdding("")} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] text-accent-ink hover:bg-accent-soft">
                        <Plus className="h-3 w-3" /> Add a word
                      </button>
                    ) : (
                      <input
                        autoFocus
                        value={adding}
                        onChange={(e) => setAdding(e.target.value)}
                        onBlur={() => setAdding(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && adding.trim()) {
                            e.preventDefault();
                            change(adding, "add");
                            setAdding("");
                          }
                          if (e.key === "Escape") setAdding(null);
                        }}
                        placeholder="Word, then Enter"
                        className="h-7 w-[140px] rounded-full bg-surface px-2.5 text-[12.5px] shadow-card outline-none"
                      />
                    ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-[13px] text-ink-3">No known moment falls in these dates, so Brian shows everything they posted and points out the words that stand out.</p>
          )}
        </div>
      )}

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
              <span className="font-semibold text-ink">{result.posts.length} posts</span> from @{result.handle}, best first
              {result.reused ? (
                <>
                  {" "}
                  · saved research from {result.at ? relativeTime(result.at) : "earlier"}, free{" "}
                  {result.paid && (
                    <button onClick={() => look(true, true)} disabled={busy} className="text-accent-ink hover:underline">
                      Refresh (about $0.01)
                    </button>
                  )}
                </>
              ) : result.costUsd ? (
                ` · cost $${result.costUsd.toFixed(3)}`
              ) : (
                " · free"
              )}
            </p>
            <a href={result.xSearchUrl} target="_blank" rel="noreferrer" className="text-[13px] text-accent-ink hover:underline">
              Search this on X ↗
            </a>
          </div>

          <WeekPanel week={week} />

          {result.suggested.length > 0 && editable && (
            <div className="mt-4 rounded-[16px] bg-accent-soft p-4">
              <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-accent-ink">
                <Sparkles className="h-4 w-4" /> Brian noticed these words around {editable} that weren&rsquo;t on the list
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {result.suggested.map((w) => (
                  <button key={w} onClick={() => change(w, "add")} className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[12.5px] shadow-card hover:shadow-raised">
                    <Plus className="h-3 w-3 text-accent-ink" /> {w}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-ink-3">Tap to add. It&rsquo;s kept for next time, for everyone.</p>
            </div>
          )}

          {result.posts.length === 0 && (
            <p className="mt-6 rounded-[16px] bg-surface-2 p-5 text-[14.5px] text-ink-2">
              {result.others.length ? "No posts used the moment's words. Have a look at the others below." : "Nothing reachable from here. Open the search on X (free while you're logged in) and paste the best posts into Teach."}
            </p>
          )}
          <div className="mt-5 columns-1 gap-4 sm:columns-2">
            {result.posts.map((p) => (
              <PostCard key={p.id} p={p} handle={result.handle} picked={picked.has(p.id)} onPick={() => pick(p.id)} />
            ))}
          </div>

          {result.others.length > 0 && (
            <div className="mt-4">
              <button onClick={() => setShowOthers(!showOthers)} className="inline-flex items-center gap-1.5 text-[13.5px] text-accent-ink hover:underline">
                <ChevronDown className={clsx("h-4 w-4 transition", showOthers && "rotate-180")} />
                {showOthers ? "Hide" : "Show"} {result.others.length} other post{result.others.length === 1 ? "" : "s"} from these dates that didn&rsquo;t use the words
              </button>
              {showOthers && (
                <div className="mt-4 columns-1 gap-4 opacity-90 sm:columns-2">
                  {result.others.map((p) => (
                    <PostCard key={p.id} p={p} handle={result.handle} picked={picked.has(p.id)} onPick={() => pick(p.id)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {picked.size > 0 && (
            <div className="sticky bottom-4 mt-4 flex flex-wrap items-center gap-4 rounded-full bg-surface py-2 pl-2 pr-5 shadow-float">
              <button disabled={!!teaching || !ai} onClick={teach} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-bg disabled:opacity-40">
                {teaching && <Loader2 className="h-4 w-4 animate-spin" />}
                {teaching ?? `Teach Brian ${picked.size === 1 ? "this post" : `these ${picked.size} posts`}`}
              </button>
              <span className="text-[13px] text-ink-3">About ${(picked.size * 0.04).toFixed(2)}. He digests each into his brain.</span>
            </div>
          )}

          <p className="mt-4 text-[12px] text-ink-3">{result.routes.map((r) => `${r.ok ? "✓" : "–"} ${r.name}: ${r.note}`).join(" · ")}</p>
        </div>
      )}
    </div>
  );
}

/** The week in one paragraph, for Brian to read alongside a post he's being taught. */
function weekLine(w: WeekContext): string {
  const top = (xs: { title: string }[], n: number) => xs.slice(0, n).map((x) => x.title.slice(0, 90)).join("; ");
  return [w.summary, w.reading.length ? `Most-read: ${top(w.reading, 6)}.` : "", w.x.length ? `Biggest on X: ${top(w.x, 3)}.` : ""].filter(Boolean).join(" ");
}

/** What else the world was paying attention to in the same dates, across sources. */
function WeekPanel({ week }: { week: WeekContext | "loading" | null }) {
  if (!week) return null;
  if (week === "loading")
    return (
      <div className="mt-5 rounded-[18px] bg-surface-2 p-5">
        <p className="text-[14px] font-semibold">What else was happening that week</p>
        <p className="mt-1 text-[13px] text-ink-3">Brian is reading Wikipedia, the news, X and Reddit for those dates…</p>
        <div className="shimmer mt-3 h-3 w-2/3 rounded-full" />
      </div>
    );
  const cols: { name: string; hint: string; items: WeekContext["reading"] }[] = [
    { name: "What people were reading", hint: "Most-read on Wikipedia", items: week.reading },
    { name: "The news", hint: "The main stories, day by day", items: week.news },
    { name: "Biggest on X", hint: "100K+ likes, anyone", items: week.x },
    { name: "Reddit", hint: "Our audience's communities", items: week.reddit },
  ].filter((c) => c.items.length);
  return (
    <div className="mt-5 rounded-[18px] bg-surface-2 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold">What else was happening that week</p>
        {week.missing.length > 0 && <span className="text-[12px] text-ink-3">Couldn&rsquo;t reach {week.missing.join(" or ")} just now</span>}
      </div>
      {week.summary && <p className="mt-2 max-w-[820px] text-[14.5px] leading-relaxed">{week.summary}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cols.map((c) => (
          <div key={c.name} className="rounded-[14px] bg-surface p-3.5 shadow-card">
            <p className="text-[13px] font-semibold">{c.name}</p>
            <p className="text-[11.5px] text-ink-3">{c.hint}</p>
            <ol className="mt-2.5 space-y-2">
              {c.items.slice(0, 6).map((it, i) => (
                <li key={it.url + i}>
                  <a href={it.url} target="_blank" rel="noreferrer" className="block hover:underline">
                    <span className="line-clamp-2 text-[13px] leading-snug">{it.title}</span>
                  </a>
                  <span className="text-[11.5px] text-ink-3">{it.meta}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-ink-3">When you teach a post from these dates, Brian reads it against this week, so he learns what it was competing with.</p>
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
