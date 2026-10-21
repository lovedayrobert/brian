"use client";

import clsx from "clsx";
import { ArrowRight, ArrowUpRight, Check, Loader2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Kind = "truth" | "mechanic" | "industry";

export interface BrainView {
  ai: boolean;
  nodes: {
    id: string;
    kind: Kind;
    text: string;
    detail: string;
    brand?: string;
    gap?: string;
    strength: number;
    health: "strong" | "growing" | "weak" | "fading";
    evidence: { swipeId: string; title: string; note: string; supports: boolean }[];
    team: { by: string; agree: boolean; note?: string; at: string }[];
    liked: number;
    rejected: number;
    used: number;
  }[];
  questions: { id: string; text: string; nodeIds: string[] }[];
  examples: { id: string; title: string; url: string; platform: string; author?: string; why: string; lesson?: string; notes: { step: string; thought: string }[]; by: string; at: string }[];
}

type Node = BrainView["nodes"][number];
type Digest = { swipeId: string; thinking: { step: string; thought: string }[]; touched: { nodeId: string; change: "new" | "stronger" | "weaker" }[] };

const KIND: Record<Kind, { name: string; plural: string; color: string; soft: string }> = {
  truth: { name: "Audience truth", plural: "What our audience feels", color: "#f5b75b", soft: "rgba(245,183,91,0.14)" },
  mechanic: { name: "Mechanic", plural: "Why things spread", color: "#9d8cff", soft: "rgba(157,140,255,0.14)" },
  industry: { name: "Industry memory", plural: "What's been done", color: "#5fd4c4", soft: "rgba(95,212,196,0.12)" },
};
const ORDER: Kind[] = ["truth", "mechanic", "industry"];
const W = 1200;

const COLS = 2;
const ROW = 150;

/** Height of the map: tall enough for the busiest region. */
function mapHeight(nodes: Node[]) {
  const rows = Math.max(1, ...ORDER.map((k) => Math.ceil(nodes.filter((n) => n.kind === k).length / COLS)));
  return 110 + rows * ROW;
}

/** Each kind gets its own region; strongest first, two per row, so labels never collide. */
function layout(nodes: Node[]) {
  const pos = new Map<string, { x: number; y: number; r: number }>();
  ORDER.forEach((k, col) => {
    const list = nodes.filter((n) => n.kind === k).sort((a, b) => b.strength - a.strength);
    const cx = (W / 3) * col + W / 6;
    list.forEach((n, i) => {
      const row = Math.floor(i / COLS);
      const inRow = Math.min(COLS, list.length - row * COLS);
      const slot = i % COLS;
      const x = cx + (inRow === 1 ? 0 : slot === 0 ? -95 : 95);
      pos.set(n.id, { x, y: 120 + row * ROW + (slot === 1 ? 24 : 0), r: Math.min(42, 18 + n.strength * 5) });
    });
  });
  return pos;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function wrap(text: string, max = 26, lines = 3): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if ((cur + " " + w).trim().length > max) {
      out.push(cur.trim());
      cur = w;
      if (out.length === lines) break;
    } else cur = `${cur} ${w}`;
  }
  if (out.length < lines && cur.trim()) out.push(cur.trim());
  const used = out.join(" ").length;
  if (used < text.length - 1 && out.length) out[out.length - 1] = `${out[out.length - 1].replace(/[.,;:]$/, "")}…`;
  return out;
}

export function BrainApp({ view }: { view: BrainView }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [shown, setShown] = useState(0);
  const [selected, setSelected] = useState<{ type: "node" | "example"; id: string } | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  // Reveal Brian's notes one at a time, then light up what changed in his brain.
  useEffect(() => {
    if (!digest || shown > digest.thinking.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 200 : 900);
    return () => clearTimeout(t);
  }, [digest, shown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pos = useMemo(() => layout(view.nodes), [view.nodes]);
  const H = useMemo(() => mapHeight(view.nodes), [view.nodes]);
  const edges = useMemo(() => {
    const out: [string, string][] = [];
    for (let i = 0; i < view.nodes.length; i++)
      for (let j = i + 1; j < view.nodes.length; j++) {
        const a = view.nodes[i];
        const b = view.nodes[j];
        if (a.evidence.some((e) => e.supports && b.evidence.some((f) => f.supports && f.swipeId === e.swipeId))) out.push([a.id, b.id]);
      }
    return out;
  }, [view.nodes]);
  const lit = new Set(digest && shown > digest.thinking.length ? digest.touched.map((t) => t.nodeId) : []);
  const focus = selected?.type === "node" ? selected.id : hover;
  const counts = Object.fromEntries(ORDER.map((k) => [k, view.nodes.filter((n) => n.kind === k).length])) as Record<Kind, number>;

  async function teach(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    setDigest(null);
    setShown(0);
    const res = await fetch("/api/brain/teach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, why }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Brian couldn't read that one.");
    setUrl("");
    setWhy("");
    setDigest(json.digest);
    router.refresh();
  }

  const node = selected?.type === "node" ? view.nodes.find((n) => n.id === selected.id) : undefined;
  const example = selected?.type === "example" ? view.examples.find((x) => x.id === selected.id) : undefined;

  return (
    <div className="brain-screen min-h-dvh bg-[#07070b] text-[#ececf1] antialiased">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(157,140,255,0.16),transparent_55%)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className={clsx("absolute inline-flex h-full w-full rounded-full bg-[#9d8cff] opacity-60", busy ? "animate-ping" : "animate-[breathe_4s_ease-in-out_infinite]")} />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#9d8cff]" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">Brian</span>
          <span className="hidden text-[13px] text-white/40 sm:inline">Cashy&rsquo;s marketing brain</span>
        </div>
        <Link href="/home" className="group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] text-white/50 ring-1 ring-white/10 transition hover:text-white hover:ring-white/25">
          Team tools <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-[1240px] px-6 pb-24 sm:px-10">
        <section className="mx-auto mt-10 max-w-[760px] text-center sm:mt-16">
          <h1 className="mx-auto max-w-[720px] text-balance text-[32px] font-semibold leading-[1.12] tracking-[-0.025em] sm:text-[44px]">
            {view.nodes.length ? (
              <>
                I know <span className="text-[#f5b75b]">{plural(counts.truth, "truth")}</span> about our audience and{" "}
                <span className="text-[#9d8cff]">{plural(counts.mechanic, "reason")}</span> things spread.
              </>
            ) : (
              <>Teach me what good looks like.</>
            )}
          </h1>
          <p className="mx-auto mt-4 max-w-[560px] text-[15.5px] leading-relaxed text-white/50">
            Give me a campaign or post that worked. I&rsquo;ll work out why, file it with everything I know, and build ideas from it. Never copies.
          </p>

          <form onSubmit={teach} className="mx-auto mt-9 max-w-[640px] text-left">
            <div className="rounded-[26px] bg-white/[0.05] p-1.5 ring-1 ring-white/10 transition focus-within:ring-[#9d8cff]/60">
              <div className="flex items-center gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={busy}
                  placeholder="Paste a link: X, TikTok, YouTube, an article"
                  className="h-12 min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none placeholder:text-white/30"
                />
                <button
                  type="submit"
                  disabled={busy || !url.trim() || !view.ai}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#9d8cff] px-5 text-[14px] font-medium text-[#0b0b12] transition hover:bg-[#b0a2ff] disabled:opacity-30"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {busy ? "Thinking" : "Teach Brian"}
                </button>
              </div>
              {url.trim() && !busy && (
                <input
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder="Why do you rate it? (optional, but I learn most from this)"
                  className="mt-1 h-11 w-full animate-[rise_.25s_ease-out] rounded-[20px] bg-white/[0.04] px-4 text-[14px] outline-none placeholder:text-white/30"
                />
              )}
            </div>
            {error && <p className="mt-3 text-center text-[13px] text-[#ff7a6b]">{error}</p>}
          </form>
        </section>

        {(busy || digest) && (
          <section className="mx-auto mt-10 max-w-[760px] rounded-[24px] bg-white/[0.035] p-6 ring-1 ring-white/[0.08] sm:p-8">
            {busy && (
              <div className="space-y-4">
                <p className="text-[14px] text-white/60">Reading it, and comparing it with everything I know…</p>
                {[78, 92, 64].map((w, i) => (
                  <div key={i} className="h-3 animate-pulse rounded-full bg-white/[0.06]" style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            )}
            {digest && (
              <ol className="space-y-5">
                {digest.thinking.slice(0, shown).map((t, i) => (
                  <li key={i} className="grid animate-[rise_.5s_ease-out] grid-cols-[110px_1fr] gap-4 sm:grid-cols-[150px_1fr]">
                    <span className="pt-0.5 text-[12.5px] font-medium uppercase tracking-[0.06em] text-[#9d8cff]">{t.step}</span>
                    <span className="text-[15px] leading-relaxed text-white/85">{t.thought}</span>
                  </li>
                ))}
                {shown > digest.thinking.length && (
                  <li className="animate-[rise_.5s_ease-out] border-t border-white/[0.08] pt-5">
                    <p className="mb-3 text-[12.5px] font-medium uppercase tracking-[0.06em] text-white/40">What changed in my brain</p>
                    <div className="flex flex-wrap gap-2">
                      {digest.touched.map((t) => {
                        const n = view.nodes.find((x) => x.id === t.nodeId);
                        if (!n) return null;
                        return (
                          <button
                            key={t.nodeId}
                            onClick={() => setSelected({ type: "node", id: n.id })}
                            className="flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-left text-[13px] ring-1 transition hover:brightness-125"
                            style={{ background: KIND[n.kind].soft, color: KIND[n.kind].color, boxShadow: `inset 0 0 0 1px ${KIND[n.kind].color}33` }}
                          >
                            <span className="shrink-0 font-medium">{t.change === "new" ? "New" : t.change === "stronger" ? "Stronger" : "Weaker"}</span>
                            <span className="truncate text-white/80">{n.brand ? `${n.brand}: ` : ""}{n.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </li>
                )}
              </ol>
            )}
          </section>
        )}

        {view.questions.slice(0, 1).map((q) => (
          <Question key={q.id} q={q} />
        ))}

        <section className="mt-16">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-white/40">My brain</h2>
            <div className="flex flex-wrap gap-4 text-[12.5px] text-white/50">
              {ORDER.map((k) => (
                <span key={k} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: KIND[k].color }} />
                  {KIND[k].plural} <span className="text-white/30">{counts[k]}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[28px] bg-white/[0.02] ring-1 ring-white/[0.07]">
            {view.nodes.length === 0 ? (
              <div className="grid h-[360px] place-items-center text-center text-[15px] text-white/35">
                Empty, for now. Every link you teach me grows this.
              </div>
            ) : (
              <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="10" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {ORDER.map((k, col) => (
                  <text key={k} x={(W / 3) * col + W / 6} y={40} textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize="13" letterSpacing="1.2">
                    {KIND[k].plural.toUpperCase()}
                  </text>
                ))}
                {edges.map(([a, b]) => {
                  const pa = pos.get(a);
                  const pb = pos.get(b);
                  if (!pa || !pb) return null;
                  const on = focus === a || focus === b || (lit.has(a) && lit.has(b));
                  return (
                    <path
                      key={`${a}-${b}`}
                      d={`M${pa.x},${pa.y} Q${(pa.x + pb.x) / 2},${Math.min(pa.y, pb.y) - 60} ${pb.x},${pb.y}`}
                      fill="none"
                      stroke={on ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.07)"}
                      strokeWidth={on ? 1.4 : 1}
                      className="transition-all duration-500"
                    />
                  );
                })}
                {view.nodes.map((n) => {
                  const p = pos.get(n.id)!;
                  const c = KIND[n.kind].color;
                  const isOn = focus === n.id || lit.has(n.id);
                  const dim = focus && focus !== n.id && !edges.some(([a, b]) => (a === focus && b === n.id) || (b === focus && a === n.id));
                  return (
                    <g
                      key={n.id}
                      onClick={() => setSelected({ type: "node", id: n.id })}
                      onMouseEnter={() => setHover(n.id)}
                      onMouseLeave={() => setHover(null)}
                      className="cursor-pointer transition-opacity duration-300"
                      opacity={dim ? 0.3 : n.health === "fading" ? 0.45 : 1}
                    >
                      {lit.has(n.id) && <circle cx={p.x} cy={p.y} r={p.r + 10} fill="none" stroke={c} strokeOpacity="0.5" className="animate-[ring_1.6s_ease-out_infinite]" style={{ transformOrigin: `${p.x}px ${p.y}px` }} />}
                      <circle cx={p.x} cy={p.y} r={p.r} fill={c} fillOpacity={isOn ? 0.35 : 0.16} stroke={c} strokeWidth={isOn ? 2 : 1.2} strokeDasharray={n.health === "fading" ? "4 4" : undefined} filter={isOn ? "url(#glow)" : undefined} />
                      <circle cx={p.x} cy={p.y} r={Math.max(3, p.r * 0.18)} fill={c} />
                      {wrap(n.brand ? `${n.brand}: ${n.text}` : n.text).map((line, i) => (
                        <text key={i} x={p.x} y={p.y + p.r + 18 + i * 16} textAnchor="middle" fontSize="12.5" fill={isOn ? "#fff" : "rgba(255,255,255,0.6)"}>
                          {line}
                        </text>
                      ))}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </section>

        {view.examples.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-4 text-[13px] font-medium uppercase tracking-[0.08em] text-white/40">What you&rsquo;ve taught me</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {view.examples.map((x) => (
                <button
                  key={x.id}
                  onClick={() => setSelected({ type: "example", id: x.id })}
                  className="group rounded-[20px] bg-white/[0.03] p-5 text-left ring-1 ring-white/[0.07] transition hover:bg-white/[0.05] hover:ring-white/15"
                >
                  <div className="text-[12px] text-white/35">
                    {x.platform}
                    {x.author ? ` · ${x.author}` : ""} · from {x.by}
                  </div>
                  <div className="mt-2 line-clamp-2 text-[15px] font-medium leading-snug text-white/90">{x.title}</div>
                  {x.lesson && <div className="mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-white/50">{x.lesson}</div>}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" onClick={() => setSelected(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-[460px] animate-[slide_.3s_ease-out] overflow-y-auto bg-[#0c0c13] px-7 py-7 ring-1 ring-white/10">
            <button aria-label="Close" onClick={() => setSelected(null)} className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            {node && <NodePanel n={node} onExample={(id) => setSelected({ type: "example", id })} />}
            {example && <ExamplePanel x={example} nodes={view.nodes} onNode={(id) => setSelected({ type: "node", id })} />}
          </aside>
        </>
      )}
    </div>
  );
}

function NodePanel({ n, onExample }: { n: Node; onExample: (id: string) => void }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const k = KIND[n.kind];
  async function judge(agree: boolean) {
    setBusy(true);
    await fetch(`/api/brain/nodes/${n.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agree, note }) });
    setBusy(false);
    setNote("");
    router.refresh();
  }
  const pct = Math.min(100, (n.strength / 8) * 100);
  return (
    <div className="pr-8">
      <div className="text-[12px] font-medium uppercase tracking-[0.08em]" style={{ color: k.color }}>
        {k.name}
      </div>
      <h3 className="mt-3 text-[22px] font-semibold leading-snug tracking-tight">{n.brand ? `${n.brand}: ${n.text}` : n.text}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-white/60">{n.detail}</p>
      {n.gap && (
        <div className="mt-5 rounded-[16px] bg-white/[0.04] p-4">
          <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/40">What could have been better</div>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/80">{n.gap}</p>
        </div>
      )}

      <div className="mt-7">
        <div className="flex items-baseline justify-between text-[12.5px] text-white/45">
          <span>How sure I am</span>
          <span className="capitalize">{n.health}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: k.color }} />
        </div>
        {n.used > 0 && (
          <p className="mt-2 text-[12.5px] text-white/45">
            Built {n.used} idea{n.used === 1 ? "" : "s"} on this: {n.liked} liked, {n.rejected} rejected.
          </p>
        )}
      </div>

      <div className="mt-7">
        <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/40">Where I learned it</div>
        <ul className="mt-3 space-y-2">
          {n.evidence.map((e, i) => (
            <li key={i}>
              <button onClick={() => onExample(e.swipeId)} className="w-full rounded-[14px] bg-white/[0.03] p-3.5 text-left transition hover:bg-white/[0.06]">
                <div className="line-clamp-1 text-[14px] text-white/85">{e.title}</div>
                <div className={clsx("mt-1 text-[13px]", e.supports ? "text-white/45" : "text-[#ff9a8b]")}>
                  {e.supports ? "" : "Argues against it: "}
                  {e.note}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {n.team.length > 0 && (
        <div className="mt-7">
          <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/40">What the team said</div>
          <ul className="mt-3 space-y-2 text-[14px]">
            {n.team.map((t, i) => (
              <li key={i} className="text-white/70">
                <span className="font-medium text-white">{t.by}</span> {t.agree ? "agreed" : "disagreed"}
                {t.note ? `: ${t.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 border-t border-white/[0.08] pt-6">
        <div className="text-[14px] text-white/70">Is this right about Cashy&rsquo;s audience?</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Add a note if you want (optional)"
          className="mt-3 w-full resize-none rounded-[14px] bg-white/[0.05] px-4 py-3 text-[14px] outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-[#9d8cff]/50"
        />
        <div className="mt-3 flex gap-2">
          <button disabled={busy} onClick={() => judge(true)} className="flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-medium text-black disabled:opacity-40">
            <Check className="h-4 w-4" /> Yes, that&rsquo;s right
          </button>
          <button disabled={busy} onClick={() => judge(false)} className="h-10 rounded-full px-4 text-[13.5px] text-white/70 ring-1 ring-white/15 hover:text-white disabled:opacity-40">
            No, it isn&rsquo;t
          </button>
        </div>
      </div>
    </div>
  );
}

function ExamplePanel({ x, nodes, onNode }: { x: BrainView["examples"][number]; nodes: Node[]; onNode: (id: string) => void }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formed = nodes.filter((n) => n.evidence.some((e) => e.swipeId === x.id));
  async function correct() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/learning/${x.id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verdict: "partly", note }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Couldn't send that");
    setNote("");
    router.refresh();
  }
  return (
    <div className="pr-8">
      <div className="text-[12px] text-white/40">
        {x.platform}
        {x.author ? ` · ${x.author}` : ""} · taught by {x.by}
      </div>
      <h3 className="mt-3 text-[20px] font-semibold leading-snug tracking-tight">{x.title}</h3>
      <a href={x.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13px] text-[#9d8cff] hover:underline">
        Open the original <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
      {x.why && <p className="mt-4 text-[14.5px] leading-relaxed text-white/60">&ldquo;{x.why}&rdquo;</p>}
      {x.lesson && (
        <div className="mt-6 rounded-[16px] bg-[#9d8cff]/[0.08] p-4 ring-1 ring-[#9d8cff]/20">
          <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-[#9d8cff]">The lesson</div>
          <p className="mt-1.5 text-[15px] leading-relaxed text-white/90">{x.lesson}</p>
        </div>
      )}
      {x.notes.length > 0 && (
        <ol className="mt-7 space-y-4">
          {x.notes.map((t, i) => (
            <li key={i}>
              <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/40">{t.step}</div>
              <p className="mt-1 text-[14.5px] leading-relaxed text-white/75">{t.thought}</p>
            </li>
          ))}
        </ol>
      )}
      {formed.length > 0 && (
        <div className="mt-7">
          <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/40">What it taught me</div>
          <div className="mt-3 space-y-2">
            {formed.map((n) => (
              <button key={n.id} onClick={() => onNode(n.id)} className="flex w-full items-start gap-3 rounded-[14px] bg-white/[0.03] p-3.5 text-left transition hover:bg-white/[0.06]">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: KIND[n.kind].color }} />
                <span className="text-[14px] leading-snug text-white/85">{n.brand ? `${n.brand}: ` : ""}{n.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-8 border-t border-white/[0.08] pt-6">
        <div className="text-[14px] text-white/70">Did I miss the point?</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Tell me what I got wrong. Your words become the truth I learn from."
          className="mt-3 w-full resize-none rounded-[14px] bg-white/[0.05] px-4 py-3 text-[14px] outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-[#9d8cff]/50"
        />
        <button disabled={busy || !note.trim()} onClick={correct} className="mt-3 flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-medium text-black disabled:opacity-40">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Rethinking it" : "Correct me"}
        </button>
        {error && <p className="mt-2 text-[13px] text-[#ff7a6b]">{error}</p>}
      </div>
    </div>
  );
}

function Question({ q }: { q: BrainView["questions"][number] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function answer() {
    setBusy(true);
    await fetch(`/api/brain/questions/${q.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    setBusy(false);
    router.refresh();
  }
  return (
    <section className="mx-auto mt-10 max-w-[760px] rounded-[24px] bg-[#9d8cff]/[0.07] p-6 ring-1 ring-[#9d8cff]/25 sm:p-7">
      <div className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-[#9d8cff]">I&rsquo;m not sure about something</div>
      <p className="mt-2.5 text-[18px] leading-snug text-white/90">{q.text}</p>
      <div className="mt-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Your answer"
          className="h-11 min-w-0 flex-1 rounded-full bg-black/30 px-4 text-[14px] outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-[#9d8cff]/50"
        />
        <button disabled={busy || !text.trim()} onClick={answer} className="h-11 rounded-full bg-[#9d8cff] px-5 text-[14px] font-medium text-[#0b0b12] disabled:opacity-40">
          Answer
        </button>
      </div>
    </section>
  );
}
