"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ExampleView, NodeView, QuestionView } from "@/lib/brain-view";
import { BrainMesh, FULL_BRAIN, type MeshLink, type MeshPoint } from "./brain-mesh";

/** Pieces shared by the main Brian's page and every campaign's page. */

export type Kind = NodeView["kind"];
type Digest = { swipeId: string; thinking: { step: string; thought: string }[]; touched: { nodeId: string; change: "new" | "stronger" | "weaker" }[] };

export const KIND: Record<Kind, { name: string; plural: string }> = {
  truth: { name: "Audience truth", plural: "What our audience feels" },
  mechanic: { name: "Mechanic", plural: "Why things spread" },
  industry: { name: "Industry memory", plural: "What's been done" },
  cliche: { name: "Cliché", plural: "What everyone does" },
};
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const MONO = "font-medium uppercase tracking-[0.06em]";
const solid = "rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-bg hover:opacity-90 disabled:opacity-40";
const outline = "rounded-full bg-surface px-4 py-2 text-[13.5px] font-medium shadow-card hover:shadow-raised disabled:opacity-40";
const area = "w-full resize-none border-b border-line bg-transparent py-2 text-[15px] outline-none placeholder:text-ink-3 focus:border-line-strong";
const pill = "h-11 w-full rounded-full bg-surface-3 px-4 text-[14.5px] outline-none placeholder:text-ink-3 focus:bg-surface focus:shadow-card";

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx(MONO, "text-[12px] text-ink-3", className)}>{children}</div>;
}

/** Strength as a row of ticks, like a reading on an instrument. */
export function Ticks({ value, max = 8 }: { value: number; max?: number }) {
  const on = Math.max(0, Math.min(max, Math.round(value)));
  return (
    <span className="inline-flex gap-[3px]" aria-label={`Strength ${value}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={clsx("h-[9px] w-[3px]", i < on ? "bg-ink" : "bg-surface-3")} />
      ))}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-5">
      <Label className="mb-2">{label}</Label>
      {children}
    </div>
  );
}

/** Paste a link, say why, and watch Brian (or a campaign's Brian) file it. */
export function TeachBox({ ai, nodes, campaignId, campaignName, onNode }: { ai: boolean; nodes: NodeView[]; campaignId?: string; campaignName?: string; onNode: (id: string) => void }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!digest || shown > digest.thinking.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 200 : 1000);
    return () => clearTimeout(t);
  }, [digest, shown]);

  async function teach(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    setDigest(null);
    setShown(0);
    const res = await fetch("/api/brain/teach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, why, campaignId }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Brian couldn't read that one.");
    setUrl("");
    setWhy("");
    setDigest(json.digest);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={teach}>
        <label className="mb-1.5 block text-[13px] font-medium text-ink-2">A post or campaign you rate</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} placeholder="Paste a link: X, TikTok, YouTube, an article" className={clsx(pill, "min-w-0 flex-1")} />
          <button type="submit" disabled={busy || !url.trim() || !ai} className="h-11 shrink-0 rounded-full bg-ink px-5 text-[14px] font-medium text-bg hover:opacity-90 disabled:opacity-40">
            {busy ? "Brian is thinking…" : campaignName ? `Teach ${campaignName}'s Brian` : "Teach Brian"}
          </button>
        </div>
        <label className="mb-1.5 mt-4 block text-[13px] font-medium text-ink-2">Why you rate it (optional, but he learns most from this)</label>
        <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. one real act, rode the GTA hype, people shared it to laugh at themselves" className={pill} />
        <p className="mt-3 text-[12.5px] text-ink-3">About $0.04 each. He can&rsquo;t watch videos, so for a video say what happens in it.</p>
        {error && <p className="mt-3 text-[13.5px] text-bad">{error}</p>}
      </form>
      {(busy || digest) && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-[15.5px] font-semibold">{busy ? "Brian is reading it…" : "How Brian filed it"}</h3>
          {busy && <div className="shimmer mt-4 h-3 w-2/3 rounded-full" />}
          {digest && (
            <ol className="mt-2">
              {digest.thinking.slice(0, shown).map((t, i) => (
                <li key={i} className="grid animate-[rise_.5s_ease-out] grid-cols-1 gap-1 border-t border-line py-4 sm:grid-cols-[170px_1fr] sm:gap-6">
                  <span className="text-[13px] font-medium text-ink-2">{t.step}</span>
                  <p className="text-[15px] leading-relaxed">{t.thought}</p>
                </li>
              ))}
              {shown > digest.thinking.length && (
                <li className="animate-[rise_.5s_ease-out] border-t border-line pt-4">
                  <p className="mb-3 text-[13px] font-medium text-ink-2">What changed in {campaignName ? `${campaignName}'s Brian` : "his brain"}</p>
                  <div className="flex flex-wrap gap-2">
                    {digest.touched.map((t) => {
                      const n = nodes.find((x) => x.id === t.nodeId);
                      if (!n) return null;
                      return (
                        <button key={t.nodeId} onClick={() => onNode(n.id)} className="inline-flex max-w-full items-center gap-2 rounded-full bg-surface-3 px-3 py-1.5 text-left text-[13px] hover:bg-accent-soft">
                          <span className={clsx("shrink-0 font-medium", t.change === "weaker" ? "text-bad" : "text-good")}>{t.change === "new" ? "New" : t.change === "stronger" ? "Stronger" : "Weaker"}</span>
                          <span className="truncate">
                            {n.brand ? `${n.brand}: ` : ""}
                            {n.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              )}
            </ol>
          )}
        </div>
      )}
    </>
  );
}

/** The brain picture with plain counts beside it. */
export function MiniBrain({ nodes, examples, highlight, preview, counts, note }: { nodes: NodeView[]; examples: ExampleView[]; highlight?: string | null; preview?: number; counts: { n: number; label: string }[]; note: React.ReactNode }) {
  const { points, links } = useMemo(() => {
    const max = Math.max(4, ...nodes.map((n) => n.strength));
    const points: MeshPoint[] = [...nodes.map((n) => ({ id: n.id, weight: n.strength / max, group: n.kind === "cliche" ? "industry" : n.kind })), ...examples.map((x) => ({ id: x.id, weight: 0.15, group: "example" }))];
    const links: MeshLink[] = [];
    for (const n of nodes) for (const e of n.evidence) links.push({ a: n.id, b: e.swipeId, w: e.supports ? 0.5 : 0.2 });
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) if (nodes[i].evidence.some((e) => nodes[j].evidence.some((f) => f.swipeId === e.swipeId))) links.push({ a: nodes[i].id, b: nodes[j].id, w: 1 });
    return { points, links };
  }, [nodes, examples]);
  return (
    <div className="grid gap-5 rounded-[22px] bg-surface p-5 shadow-card sm:p-6 md:grid-cols-[300px_1fr] md:items-center">
      <div className="relative h-[220px] overflow-hidden rounded-[16px] bg-surface-2">
        <BrainMesh formation={preview ?? nodes.length / FULL_BRAIN} points={points} links={links} highlight={highlight} />
      </div>
      <div>
        <div className="grid grid-cols-3 gap-4">
          {counts.map((c) => (
            <div key={c.label}>
              <div className="display tabular text-[30px] leading-none">{c.n}</div>
              <div className="mt-1.5 text-[13px] text-ink-2">{c.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[13.5px] leading-relaxed text-ink-2">{note}</p>
      </div>
    </div>
  );
}

/** Columns of what a Brian knows, as cards you can open. */
export function KnowledgeColumns({ columns, onNode, onHover }: { columns: { title: string; nodes: NodeView[]; sub?: (n: NodeView) => string | undefined }[]; onNode: (id: string) => void; onHover?: (id: string | null) => void }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {columns.map((c) => (
        <div key={c.title}>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[14px] font-semibold">{c.title}</span>
            <span className="text-[12.5px] text-ink-3">{c.nodes.length}</span>
          </div>
          {c.nodes.length === 0 ? (
            <p className="rounded-[16px] border border-dashed border-line-strong p-4 text-[13.5px] text-ink-3">Nothing yet.</p>
          ) : (
            <ul>
              {c.nodes.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => onNode(n.id)}
                    onMouseEnter={() => onHover?.(n.id)}
                    onMouseLeave={() => onHover?.(null)}
                    className={clsx("mb-2 block w-full rounded-[16px] bg-surface p-4 text-left shadow-card transition hover:shadow-raised", n.health === "fading" && "opacity-40")}
                  >
                    <p className="text-[14.5px] leading-snug">
                      {n.brand ? `${n.brand}: ` : ""}
                      {n.text}
                    </p>
                    {c.sub?.(n) && <p className="mt-1.5 text-[12.5px] text-ink-3">{c.sub(n)}</p>}
                    <div className="mt-3 flex items-center gap-2">
                      <Ticks value={n.strength} />
                      <span className="text-[12px] capitalize text-ink-3">{n.health}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/** The examples a Brian learned from. */
export function ExampleList({ title, examples, onExample, onHover }: { title: string; examples: ExampleView[]; onExample: (id: string) => void; onHover?: (id: string | null) => void }) {
  if (!examples.length) return null;
  return (
    <section className="mt-12">
      <h2 className="mb-3 text-[17px] font-semibold tracking-tight">
        {title} ({examples.length})
      </h2>
      <ul className="grid gap-2 md:grid-cols-2">
        {examples.map((x) => (
          <li key={x.id}>
            <button onClick={() => onExample(x.id)} onMouseEnter={() => onHover?.(x.id)} onMouseLeave={() => onHover?.(null)} className="block h-full w-full rounded-[16px] bg-surface p-4 text-left shadow-card transition hover:shadow-raised">
              <div className="text-[12.5px] text-ink-3">
                {x.platform}
                {x.author ? ` · ${x.author}` : ""} · from {x.by}
              </div>
              <p className="mt-1 line-clamp-2 text-[15px] font-medium leading-snug">{x.title}</p>
              {x.lesson && <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">{x.lesson}</p>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The side panel for one piece of knowledge or one example. Escape closes it. */
export function Drawer({ selected, setSelected, nodes, examples }: { selected: { type: "node" | "example"; id: string } | null; setSelected: (s: { type: "node" | "example"; id: string } | null) => void; nodes: NodeView[]; examples: ExampleView[] }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelected]);
  if (!selected) return null;
  const node = selected.type === "node" ? nodes.find((n) => n.id === selected.id) : undefined;
  const example = selected.type === "example" ? examples.find((x) => x.id === selected.id) : undefined;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setSelected(null)} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] animate-[slide_.25s_ease-out] overflow-y-auto bg-bg px-8 py-8 shadow-float">
        <button onClick={() => setSelected(null)} className="absolute right-8 top-8 text-[13px] text-ink-2 hover:text-ink">
          Close
        </button>
        {node && <NodePanel n={node} onExample={(id) => setSelected({ type: "example", id })} />}
        {example && <ExamplePanel x={example} nodes={nodes} onNode={(id) => setSelected({ type: "node", id })} />}
      </aside>
    </>
  );
}

function NodePanel({ n, onExample }: { n: NodeView; onExample: (id: string) => void }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [promoted, setPromoted] = useState<string | null>(null);
  async function judge(agree: boolean) {
    setBusy(true);
    await fetch(`/api/brain/nodes/${n.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agree, note }) });
    setBusy(false);
    setNote("");
    router.refresh();
  }
  async function promote() {
    setBusy(true);
    const res = await fetch(`/api/brain/nodes/${n.id}/promote`, { method: "POST" });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    setPromoted(res.ok ? "Done: the main Brian knows this now. This campaign keeps its own copy." : (json.error ?? "Couldn't do that"));
    router.refresh();
  }
  return (
    <div className="pt-6">
      <Label>
        {KIND[n.kind].name}
        {n.campaignName ? ` · ${n.campaignName} campaign only` : " · Main Brian"}
      </Label>
      <h3 className="mt-4 text-[24px] leading-snug tracking-[-0.01em]">{n.brand ? `${n.brand}: ${n.text}` : n.text}</h3>
      <p className="mt-4 pb-6 text-[15.5px] leading-relaxed text-ink-2">{n.detail}</p>
      {n.gap && (
        <Field label="What could have been better">
          <p className="text-[15.5px] leading-relaxed">{n.gap}</p>
        </Field>
      )}
      <Field label="How sure I am">
        <div className="flex items-center gap-3">
          <Ticks value={n.strength} />
          <Label className="text-ink">{n.health}</Label>
        </div>
        {n.used > 0 && (
          <p className="mt-3 text-[14.5px]">
            Built {plural(n.used, "idea")} on this: {n.liked} liked, {n.rejected} rejected.
          </p>
        )}
      </Field>
      <Field label="Where I learned it">
        <ul className="space-y-3">
          {n.evidence.map((e, i) => (
            <li key={i}>
              <button onClick={() => onExample(e.swipeId)} className="text-left hover:opacity-60">
                <p className="text-[15px] underline decoration-line-strong underline-offset-4">{e.title}</p>
                <p className="mt-1 text-[13.5px] text-ink-2">
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
          <ul className="space-y-2 text-[15px]">
            {n.team.map((t, i) => (
              <li key={i}>
                {t.by} {t.agree ? "agreed" : "disagreed"}
                {t.note ? `: ${t.note}` : ""}
              </li>
            ))}
          </ul>
        </Field>
      )}
      <Field label="Is this right?">
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
      {n.campaignId && n.kind !== "cliche" && (
        <Field label="True beyond this campaign?">
          <p className="text-[14px] leading-relaxed text-ink-2">If this holds on any day, not just for {n.campaignName ?? "this campaign"}, copy it into the main Brian. The campaign keeps its own copy.</p>
          <button disabled={busy || !!promoted} onClick={promote} className={clsx(outline, "mt-4")}>
            Teach Brian too
          </button>
          {promoted && <p className="mt-3 text-[13.5px] text-ink-2">{promoted}</p>}
        </Field>
      )}
    </div>
  );
}

function ExamplePanel({ x, nodes, onNode }: { x: ExampleView; nodes: NodeView[]; onNode: (id: string) => void }) {
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
      <h3 className="mt-4 text-[22px] leading-snug tracking-[-0.01em]">{x.title}</h3>
      <a href={x.url} target="_blank" rel="noreferrer" className="mb-6 mt-3 inline-block text-[13px] text-accent-ink hover:underline">
        Open the original ↗
      </a>
      {x.why && (
        <Field label="Why you rate it">
          <p className="text-[15.5px] leading-relaxed">&ldquo;{x.why}&rdquo;</p>
        </Field>
      )}
      {x.lesson && (
        <Field label="The lesson">
          <p className="text-[17px] leading-relaxed">{x.lesson}</p>
        </Field>
      )}
      {x.notes.map((t, i) => (
        <Field key={i} label={t.step}>
          <p className="text-[15px] leading-relaxed text-ink-2">{t.thought}</p>
        </Field>
      ))}
      {formed.length > 0 && (
        <Field label="What it taught me">
          <ul className="space-y-3">
            {formed.map((n) => (
              <li key={n.id}>
                <button onClick={() => onNode(n.id)} className="text-left text-[15px] hover:opacity-60">
                  <span className={clsx(MONO, "mr-2 text-[11px] text-ink-3")}>{KIND[n.kind].name}</span>
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

export function Question({ q }: { q: QuestionView }) {
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
    <section className="mt-6 rounded-[22px] bg-accent-soft p-5 sm:p-7">
      <Label className="text-ink">I&rsquo;m not sure about something</Label>
      <p className="mt-4 text-[20px] leading-snug">{q.text}</p>
      <div className="mt-5 flex items-center gap-2 rounded-full bg-surface p-1.5 pl-5 shadow-card">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Your answer" className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-ink-3" />
        <button disabled={busy || !text.trim()} onClick={answer} className="h-9 rounded-full bg-ink px-4 text-[13.5px] font-medium text-bg disabled:opacity-40">
          Answer
        </button>
      </div>
    </section>
  );
}
