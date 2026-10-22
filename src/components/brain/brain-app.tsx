"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LookBack } from "./look-back";
import { BrainMesh, FULL_BRAIN, type MeshLink, type MeshPoint } from "./brain-mesh";

type Kind = "truth" | "mechanic" | "industry";

export interface BrainView {
  ai: boolean;
  /** Looking back at a brand's posts around a moment */
  lookback: { paid: "history" | "recent" | "none"; moments: { title: string; date: string }[] };
  /** ?brain=0..1 shows the brain at a given stage of growth, to preview it (the knowledge shown stays real) */
  preview?: number;
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

const KIND: Record<Kind, { name: string; plural: string }> = {
  truth: { name: "Audience truth", plural: "What our audience feels" },
  mechanic: { name: "Mechanic", plural: "Why things spread" },
  industry: { name: "Industry memory", plural: "What's been done" },
};
const ORDER: Kind[] = ["truth", "mechanic", "industry"];
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const MONO = "font-[family-name:var(--font-fira)] uppercase tracking-[0.14em]";

/** Small uppercase monospace label: the voice of the interface. */
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx(MONO, "text-[11.5px] text-[#8a8a8a]", className)}>{children}</div>;
}

/** Strength as a row of ticks, like a reading on an instrument. */
function Ticks({ value, max = 8 }: { value: number; max?: number }) {
  const on = Math.max(0, Math.min(max, Math.round(value)));
  return (
    <span className="inline-flex gap-[3px]" aria-label={`Strength ${value}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={clsx("h-[9px] w-[3px]", i < on ? "bg-[#141414]" : "bg-[#e2e2e2]")} />
      ))}
    </span>
  );
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
  const [looking, setLooking] = useState(false);

  // Reveal Brian's notes one at a time, then what changed in his brain.
  useEffect(() => {
    if (!digest || shown > digest.thinking.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 200 : 1000);
    return () => clearTimeout(t);
  }, [digest, shown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { points, links } = useMemo(() => {
    const max = Math.max(4, ...view.nodes.map((n) => n.strength));
    const points: MeshPoint[] = [
      ...view.nodes.map((n) => ({ id: n.id, weight: n.strength / max, group: n.kind })),
      ...view.examples.map((x) => ({ id: x.id, weight: 0.15, group: "example" })),
    ];
    const links: MeshLink[] = [];
    for (const n of view.nodes) for (const e of n.evidence) links.push({ a: n.id, b: e.swipeId, w: e.supports ? 0.5 : 0.2 });
    for (let i = 0; i < view.nodes.length; i++)
      for (let j = i + 1; j < view.nodes.length; j++) {
        const a = view.nodes[i];
        const b = view.nodes[j];
        if (a.evidence.some((e) => b.evidence.some((f) => f.swipeId === e.swipeId))) links.push({ a: a.id, b: b.id, w: 1 });
      }
    return { points, links };
  }, [view.nodes, view.examples]);

  const pulse = useMemo(() => (busy ? points.map((p) => p.id) : digest && shown > digest.thinking.length ? digest.touched.map((t) => t.nodeId) : []), [busy, points, digest, shown]);
  const counts = Object.fromEntries(ORDER.map((k) => [k, view.nodes.filter((n) => n.kind === k).length])) as Record<Kind, number>;
  const node = selected?.type === "node" ? view.nodes.find((n) => n.id === selected.id) : undefined;
  const example = selected?.type === "example" ? view.examples.find((x) => x.id === selected.id) : undefined;

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
    if (!res.ok) return setError(json.error ?? "I couldn't read that one.");
    setUrl("");
    setWhy("");
    setDigest(json.digest);
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-white font-[family-name:var(--font-geist)] text-[#141414] antialiased">

      <main className="mx-auto max-w-[1180px] px-6 pb-32 sm:px-10">
        <section className="relative mx-auto mt-4 h-[min(58vh,520px)] w-full max-w-[760px]">
          <BrainMesh formation={view.preview ?? view.nodes.length / FULL_BRAIN} points={points} links={links} highlight={hover ?? (selected?.type === "node" ? selected.id : null)} pulse={pulse} />
        </section>

        <section className="mx-auto max-w-[760px] text-center">
          <Label>Cashy&rsquo;s marketing brain</Label>
          <h1 className="mt-6 text-balance text-[30px] font-light leading-[1.2] tracking-[-0.02em] sm:text-[40px]">
            {view.nodes.length
              ? `I know ${plural(counts.truth, "truth")} about our audience and ${plural(counts.mechanic, "reason")} things spread.`
              : "Teach me what good looks like."}
          </h1>
          <p className="mx-auto mt-5 max-w-[520px] text-[16px] font-light leading-relaxed text-[#6b6b6b]">
            Give me a campaign or post that worked. I&rsquo;ll work out why, connect it to everything I know, and build ideas from it. Never copies.
          </p>

          <form onSubmit={teach} className="mx-auto mt-12 max-w-[620px] text-left">
            <div className="flex items-end gap-4 border-b border-[#141414] pb-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={busy}
                placeholder="Paste a link that worked"
                className="min-w-0 flex-1 bg-transparent py-2 text-[18px] font-light outline-none placeholder:text-[#b5b5b5]"
              />
              <button type="submit" disabled={busy || !url.trim() || !view.ai} className={clsx(MONO, "pb-2 text-[12.5px] disabled:opacity-30")}>
                {busy ? "Thinking…" : "Teach →"}
              </button>
            </div>
            {url.trim() && !busy && (
              <input
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="Why do you rate it? (optional, but I learn most from this)"
                className="mt-5 w-full border-b border-[#dcdcdc] bg-transparent py-2 text-[15px] font-light outline-none placeholder:text-[#b5b5b5] focus:border-[#141414]"
              />
            )}
            {error && <p className="mt-4 text-[14px]">{error}</p>}
          </form>
          <button onClick={() => setLooking(!looking)} className={clsx(MONO, "mt-8 text-[11.5px] text-[#8a8a8a] hover:text-[#141414]")}>
            {looking ? "Close look back" : "Or look back: what did a brand do on a day? →"}
          </button>
        </section>

        {looking && (
          <section className="mx-auto mt-10 max-w-[760px] animate-[rise_.3s_ease-out] border-t border-[#141414] pt-8">
            <Label className="mb-6 text-[#141414]">Look back</Label>
            <LookBack moments={view.lookback.moments} paid={view.lookback.paid} ai={view.ai} />
          </section>
        )}

        {(busy || digest) && (
          <section className="mx-auto mt-20 max-w-[760px]">
            <Label className="mb-6">{busy ? "Reading it, comparing it with everything I know" : "How I filed it"}</Label>
            {busy && <div className="h-px w-full animate-pulse bg-[#141414]/30" />}
            {digest && (
              <ol>
                {digest.thinking.slice(0, shown).map((t, i) => (
                  <li key={i} className="grid animate-[rise_.5s_ease-out] grid-cols-1 gap-2 border-t border-[#ececec] py-5 sm:grid-cols-[180px_1fr] sm:gap-6">
                    <Label className="pt-1 text-[#141414]">{t.step}</Label>
                    <p className="text-[16px] font-light leading-relaxed">{t.thought}</p>
                  </li>
                ))}
                {shown > digest.thinking.length && (
                  <li className="animate-[rise_.5s_ease-out] border-t border-[#141414] pt-6">
                    <Label className="mb-4">What changed in my brain</Label>
                    <ul className="space-y-3">
                      {digest.touched.map((t) => {
                        const n = view.nodes.find((x) => x.id === t.nodeId);
                        if (!n) return null;
                        return (
                          <li key={t.nodeId}>
                            <button onClick={() => setSelected({ type: "node", id: n.id })} className="flex w-full items-baseline gap-4 text-left hover:opacity-60">
                              <span className={clsx(MONO, "w-[100px] shrink-0 text-[11.5px]")}>{t.change === "new" ? "+ New" : t.change === "stronger" ? "↑ Stronger" : "↓ Weaker"}</span>
                              <span className="text-[15.5px] font-light">
                                {n.brand ? `${n.brand}: ` : ""}
                                {n.text}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                )}
              </ol>
            )}
          </section>
        )}

        {view.questions.slice(0, 1).map((q) => (
          <Question key={q.id} q={q} />
        ))}

        <section className="mt-28">
          <div className="grid gap-14 md:grid-cols-3 md:gap-10">
            {ORDER.map((k) => {
              const list = view.nodes.filter((n) => n.kind === k).sort((a, b) => b.strength - a.strength);
              return (
                <div key={k}>
                  <div className="flex items-baseline justify-between border-b border-[#141414] pb-3">
                    <Label className="text-[#141414]">{KIND[k].plural}</Label>
                    <Label>{String(list.length).padStart(2, "0")}</Label>
                  </div>
                  {list.length === 0 ? (
                    <p className="py-5 text-[14.5px] font-light text-[#9a9a9a]">Nothing yet.</p>
                  ) : (
                    <ul>
                      {list.map((n) => (
                        <li key={n.id}>
                          <button
                            onClick={() => setSelected({ type: "node", id: n.id })}
                            onMouseEnter={() => setHover(n.id)}
                            onMouseLeave={() => setHover(null)}
                            className={clsx("block w-full border-b border-[#ececec] py-5 text-left transition-opacity", n.health === "fading" && "opacity-40", hover && hover !== n.id && "opacity-50")}
                          >
                            <p className="text-[15.5px] font-light leading-snug">
                              {n.brand ? `${n.brand}: ` : ""}
                              {n.text}
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              <Ticks value={n.strength} />
                              <Label>{n.health}</Label>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {view.examples.length > 0 && (
          <section className="mt-28">
            <div className="flex items-baseline justify-between border-b border-[#141414] pb-3">
              <Label className="text-[#141414]">What you&rsquo;ve taught me</Label>
              <Label>{String(view.examples.length).padStart(2, "0")}</Label>
            </div>
            <ul>
              {view.examples.map((x) => (
                <li key={x.id}>
                  <button
                    onClick={() => setSelected({ type: "example", id: x.id })}
                    onMouseEnter={() => setHover(x.id)}
                    onMouseLeave={() => setHover(null)}
                    className="grid w-full grid-cols-1 gap-2 border-b border-[#ececec] py-6 text-left hover:opacity-60 sm:grid-cols-[220px_1fr] sm:gap-8"
                  >
                    <Label>
                      {x.platform}
                      {x.author ? ` · ${x.author}` : ""}
                    </Label>
                    <div>
                      <p className="line-clamp-2 text-[17px] font-light leading-snug">{x.title}</p>
                      {x.lesson && <p className="mt-2 line-clamp-2 text-[14.5px] font-light leading-relaxed text-[#6b6b6b]">{x.lesson}</p>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-white/60" onClick={() => setSelected(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] animate-[slide_.25s_ease-out] overflow-y-auto border-l border-[#141414] bg-white px-8 py-8">
            <button onClick={() => setSelected(null)} className={clsx(MONO, "absolute right-8 top-8 text-[12px] hover:opacity-60")}>
              Close
            </button>
            {node && <NodePanel n={node} onExample={(id) => setSelected({ type: "example", id })} />}
            {example && <ExamplePanel x={example} nodes={view.nodes} onNode={(id) => setSelected({ type: "node", id })} />}
          </aside>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#ececec] py-5">
      <Label className="mb-2">{label}</Label>
      {children}
    </div>
  );
}

const solid = clsx(MONO, "bg-[#141414] px-5 py-2.5 text-[12px] text-white disabled:opacity-30");
const outline = clsx(MONO, "border border-[#141414] px-5 py-2.5 text-[12px] disabled:opacity-30");
const area = "w-full resize-none border-b border-[#dcdcdc] bg-transparent py-2 text-[15px] font-light outline-none placeholder:text-[#b5b5b5] focus:border-[#141414]";

function NodePanel({ n, onExample }: { n: Node; onExample: (id: string) => void }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function judge(agree: boolean) {
    setBusy(true);
    await fetch(`/api/brain/nodes/${n.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agree, note }) });
    setBusy(false);
    setNote("");
    router.refresh();
  }
  return (
    <div className="pt-6">
      <Label>{KIND[n.kind].name}</Label>
      <h3 className="mt-4 text-[24px] font-light leading-snug tracking-[-0.01em]">{n.brand ? `${n.brand}: ${n.text}` : n.text}</h3>
      <p className="mt-4 pb-6 text-[15.5px] font-light leading-relaxed text-[#5a5a5a]">{n.detail}</p>
      {n.gap && (
        <Field label="What could have been better">
          <p className="text-[15.5px] font-light leading-relaxed">{n.gap}</p>
        </Field>
      )}
      <Field label="How sure I am">
        <div className="flex items-center gap-3">
          <Ticks value={n.strength} />
          <Label className="text-[#141414]">{n.health}</Label>
        </div>
        {n.used > 0 && (
          <p className="mt-3 text-[14.5px] font-light">
            Built {plural(n.used, "idea")} on this: {n.liked} liked, {n.rejected} rejected.
          </p>
        )}
      </Field>
      <Field label="Where I learned it">
        <ul className="space-y-3">
          {n.evidence.map((e, i) => (
            <li key={i}>
              <button onClick={() => onExample(e.swipeId)} className="text-left hover:opacity-60">
                <p className="text-[15px] font-light underline decoration-[#cfcfcf] underline-offset-4">{e.title}</p>
                <p className="mt-1 text-[13.5px] font-light text-[#7a7a7a]">
                  {e.supports ? "" : "Argues against it: "}
                  {e.note}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </Field>
      {n.team.length > 0 && (
        <Field label="What the team said">
          <ul className="space-y-2 text-[15px] font-light">
            {n.team.map((t, i) => (
              <li key={i}>
                {t.by} {t.agree ? "agreed" : "disagreed"}
                {t.note ? `: ${t.note}` : ""}
              </li>
            ))}
          </ul>
        </Field>
      )}
      <Field label="Is this right about our audience?">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="A note, if you want" className={area} />
        <div className="mt-5 flex gap-3">
          <button disabled={busy} onClick={() => judge(true)} className={solid}>
            Yes, that&rsquo;s right
          </button>
          <button disabled={busy} onClick={() => judge(false)} className={outline}>
            No
          </button>
        </div>
      </Field>
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
    <div className="pt-6">
      <Label>
        {x.platform}
        {x.author ? ` · ${x.author}` : ""} · taught by {x.by}
      </Label>
      <h3 className="mt-4 text-[22px] font-light leading-snug tracking-[-0.01em]">{x.title}</h3>
      <a href={x.url} target="_blank" rel="noreferrer" className={clsx(MONO, "mt-3 mb-6 inline-block text-[12px] hover:opacity-60")}>
        Open the original ↗
      </a>
      {x.why && (
        <Field label="Why you rate it">
          <p className="text-[15.5px] font-light leading-relaxed">&ldquo;{x.why}&rdquo;</p>
        </Field>
      )}
      {x.lesson && (
        <Field label="The lesson">
          <p className="text-[17px] font-light leading-relaxed">{x.lesson}</p>
        </Field>
      )}
      {x.notes.map((t, i) => (
        <Field key={i} label={t.step}>
          <p className="text-[15px] font-light leading-relaxed text-[#4a4a4a]">{t.thought}</p>
        </Field>
      ))}
      {formed.length > 0 && (
        <Field label="What it taught me">
          <ul className="space-y-3">
            {formed.map((n) => (
              <li key={n.id}>
                <button onClick={() => onNode(n.id)} className="text-left text-[15px] font-light hover:opacity-60">
                  <span className={clsx(MONO, "mr-2 text-[11px] text-[#8a8a8a]")}>{KIND[n.kind].name}</span>
                  {n.brand ? `${n.brand}: ` : ""}
                  {n.text}
                </button>
              </li>
            ))}
          </ul>
        </Field>
      )}
      <Field label="Did I miss the point?">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Tell me what I got wrong. Your words become the truth I learn from." className={area} />
        <button disabled={busy || !note.trim()} onClick={correct} className={clsx(solid, "mt-5")}>
          {busy ? "Rethinking it…" : "Correct me"}
        </button>
        {error && <p className="mt-3 text-[14px]">{error}</p>}
      </Field>
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
    <section className="mx-auto mt-20 max-w-[760px] border-y border-[#141414] py-8">
      <Label className="text-[#141414]">I&rsquo;m not sure about something</Label>
      <p className="mt-4 text-[22px] font-light leading-snug">{q.text}</p>
      <div className="mt-6 flex items-end gap-4 border-b border-[#141414] pb-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Your answer" className="min-w-0 flex-1 bg-transparent py-2 text-[16px] font-light outline-none placeholder:text-[#b5b5b5]" />
        <button disabled={busy || !text.trim()} onClick={answer} className={clsx(MONO, "pb-2 text-[12.5px] disabled:opacity-30")}>
          Answer →
        </button>
      </div>
    </section>
  );
}
