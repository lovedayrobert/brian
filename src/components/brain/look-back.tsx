"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Post = { id: string; url: string; text: string; at: string; likes?: number; reposts?: number; replies?: number; views?: number; via: "twitterapi" | "x" | "wayback" };
type Result = { handle: string; from: string; to: string; posts: Post[]; routes: { name: string; ok: boolean; note: string }[]; xSearchUrl: string; costUsd: number };

const MONO = "font-[family-name:var(--font-fira)] uppercase tracking-[0.14em]";
const VIA = { twitterapi: "Full history", x: "X", wayback: "Archive" } as const;
const n = (v?: number) => (v === undefined ? "–" : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(v));
const shift = (d: string, days: number) => new Date(Date.parse(`${d}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * "What did this brand do on this day?" Pick a brand, a moment and a year;
 * see their posts from around it, best first; tick the ones that worked and
 * teach them to Brian in one go.
 */
export function LookBack({ moments, paid, ai }: { moments: { title: string; date: string }[]; paid: "history" | "recent" | "none"; ai: boolean }) {
  const router = useRouter();
  const titles = useMemo(() => [...new Set(moments.map((m) => m.title))].sort(), [moments]);
  const [handle, setHandle] = useState("");
  const [title, setTitle] = useState(titles.includes("Halloween") ? "Halloween" : (titles[0] ?? ""));
  const years = moments.filter((m) => m.title === title).map((m) => m.date.slice(0, 4));
  const [year, setYear] = useState(String(new Date().getUTCFullYear() - 1));
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [teaching, setTeaching] = useState<string | null>(null);

  const day = moments.find((m) => m.title === title && m.date.startsWith(year))?.date;
  const window = custom ?? (day ? { from: shift(day, -4), to: shift(day, 3) } : null);

  async function look(allowPaid: boolean) {
    if (!window) return setError("Pick a moment and a year, or set your own dates.");
    setBusy(true);
    setError(null);
    setResult(null);
    setTicked(new Set());
    const res = await fetch("/api/brain/lookback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle, ...window, allowPaid }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Couldn't look that up.");
    setResult(json);
  }

  async function teach() {
    if (!result) return;
    const picks = result.posts.filter((p) => ticked.has(p.id));
    const event = custom ? undefined : `${title} ${year}`;
    for (let i = 0; i < picks.length; i++) {
      setTeaching(`Teaching ${i + 1} of ${picks.length}…`);
      const res = await fetch("/api/brain/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: picks[i].url, event, why: `Picked from @${result.handle}'s posts ${event ? `around ${event}` : `from ${result.from} to ${result.to}`}.` }),
      });
      if (!res.ok) {
        setTeaching(null);
        return setError((await res.json().catch(() => ({}))).error ?? "Brian couldn't take that one.");
      }
    }
    setTeaching(null);
    setTicked(new Set());
    router.refresh();
  }

  const field = "border-b border-[#dcdcdc] bg-transparent py-2 text-[15px] font-light outline-none focus:border-[#141414]";

  return (
    <div className="text-left">
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-[1.2fr_1.4fr_0.8fr]">
        <label className="block">
          <span className={clsx(MONO, "text-[11px] text-[#8a8a8a]")}>Brand on X</span>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@stake" className={clsx(field, "w-full")} />
        </label>
        {!custom ? (
          <>
            <label className="block">
              <span className={clsx(MONO, "text-[11px] text-[#8a8a8a]")}>Moment</span>
              <select value={title} onChange={(e) => setTitle(e.target.value)} className={clsx(field, "w-full")}>
                {titles.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={clsx(MONO, "text-[11px] text-[#8a8a8a]")}>Year</span>
              <select value={year} onChange={(e) => setYear(e.target.value)} className={clsx(field, "w-full")}>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="block">
              <span className={clsx(MONO, "text-[11px] text-[#8a8a8a]")}>From</span>
              <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className={clsx(field, "w-full")} />
            </label>
            <label className="block">
              <span className={clsx(MONO, "text-[11px] text-[#8a8a8a]")}>To</span>
              <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className={clsx(field, "w-full")} />
            </label>
          </>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] font-light text-[#8a8a8a]">
        <span>{window ? `Looks at ${window.from} to ${window.to}` : "No date for that moment and year"}</span>
        <button onClick={() => setCustom(custom ? null : { from: window?.from ?? "", to: window?.to ?? "" })} className="underline underline-offset-4 hover:text-[#141414]">
          {custom ? "Pick a moment instead" : "Set my own dates"}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {paid !== "none" && (
          <button disabled={busy || !handle.trim() || !window} onClick={() => look(true)} className={clsx(MONO, "bg-[#141414] px-5 py-2.5 text-[12px] text-white disabled:opacity-30")}>
            {busy ? "Looking…" : paid === "history" ? "Look (about $0.01)" : "Look (up to $0.20 of X budget)"}
          </button>
        )}
        <button disabled={busy || !handle.trim() || !window} onClick={() => look(false)} className={clsx(MONO, "border border-[#141414] px-5 py-2.5 text-[12px] disabled:opacity-30")}>
          {paid === "none" ? (busy ? "Looking…" : "Look") : "Free archive only"}
        </button>
      </div>
      {error && <p className="mt-4 text-[14px]">{error}</p>}

      {result && (
        <div className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#141414] pb-3">
            <span className={clsx(MONO, "text-[11.5px]")}>
              @{result.handle} · {result.posts.length} posts{result.costUsd ? ` · $${result.costUsd.toFixed(3)}` : " · free"}
            </span>
            <a href={result.xSearchUrl} target="_blank" rel="noreferrer" className={clsx(MONO, "text-[11.5px] hover:opacity-60")}>
              Search this on X ↗
            </a>
          </div>
          <ul className="mt-3 space-y-1">
            {result.routes.map((r) => (
              <li key={r.name} className="text-[13px] font-light text-[#8a8a8a]">
                {r.ok ? "✓" : "–"} {r.name}: {r.note}
              </li>
            ))}
          </ul>
          {result.posts.length === 0 && (
            <p className="mt-6 text-[15px] font-light">
              Nothing reachable from here. Open the search on X (free while you&rsquo;re logged in) and paste the best posts into Teach above.
            </p>
          )}
          <ul className="mt-4">
            {result.posts.map((p) => {
              const on = ticked.has(p.id);
              return (
                <li key={p.id} className="border-b border-[#ececec]">
                  <label className="grid cursor-pointer grid-cols-[22px_1fr] gap-4 py-5">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        const next = new Set(ticked);
                        if (on) next.delete(p.id);
                        else next.add(p.id);
                        setTicked(next);
                      }}
                      className="mt-1 h-4 w-4 accent-[#141414]"
                    />
                    <div>
                      <div className={clsx(MONO, "flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-[#8a8a8a]")}>
                        <span>{new Date(p.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span>{n(p.views)} views</span>
                        <span>{n(p.likes)} likes</span>
                        <span>{n(p.reposts)} reposts</span>
                        <span>{n(p.replies)} replies</span>
                        <span>{VIA[p.via]}</span>
                      </div>
                      <p className="mt-2 line-clamp-4 whitespace-pre-line text-[15px] font-light leading-relaxed">{p.text}</p>
                      <a href={p.url} target="_blank" rel="noreferrer" className={clsx(MONO, "mt-2 inline-block text-[10.5px] text-[#8a8a8a] hover:text-[#141414]")} onClick={(e) => e.stopPropagation()}>
                        Open ↗
                      </a>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
          {ticked.size > 0 && (
            <div className="sticky bottom-4 mt-6 flex flex-wrap items-center gap-4 border border-[#141414] bg-white px-5 py-4">
              <button disabled={!!teaching || !ai} onClick={teach} className={clsx(MONO, "bg-[#141414] px-5 py-2.5 text-[12px] text-white disabled:opacity-30")}>
                {teaching ?? `Teach Brian ${ticked.size === 1 ? "this one" : `these ${ticked.size}`}`}
              </button>
              <span className="text-[13px] font-light text-[#8a8a8a]">About ${(ticked.size * 0.04).toFixed(2)}. He digests each into his brain.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
