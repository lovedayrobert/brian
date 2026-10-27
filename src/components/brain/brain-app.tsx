"use client";

import clsx from "clsx";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ExampleView, LookbackView, NodeView, QuestionView } from "@/lib/brain-view";
import { Drawer, ExampleList, KnowledgeColumns, MiniBrain, Question, TeachBox, plural } from "./shared";

export interface CampaignCard {
  id: string;
  name: string;
  moment?: string;
  from?: string;
  to?: string;
  learned: number;
  examples: number;
  ideas: number;
}

export interface BrainView {
  ai: boolean;
  lookback: LookbackView;
  /** ?brain=0..1 shows the brain at a given stage of growth, to preview it (the knowledge shown stays real) */
  preview?: number;
  nodes: NodeView[];
  questions: QuestionView[];
  examples: ExampleView[];
  campaigns: CampaignCard[];
}

/**
 * The main Brian: learns from the present day, what's true on any day. Every
 * campaign has its own Brian, opened from the Campaigns section here.
 */
export function BrainApp({ view }: { view: BrainView }) {
  const [selected, setSelected] = useState<{ type: "node" | "example"; id: string } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const of = (k: NodeView["kind"]) => view.nodes.filter((n) => n.kind === k).sort((a, b) => b.strength - a.strength);
  const openNode = (id: string) => setSelected({ type: "node", id });

  return (
    <div className="min-h-dvh bg-bg text-ink antialiased">
      <main className="mx-auto max-w-[1100px] px-4 pb-28 pt-8 sm:px-6 lg:px-10 lg:pt-10">
        <header className="mb-8">
          <h1 className="display text-[30px] leading-[1.1] sm:text-[34px]">Brian</h1>
          <p className="mt-2 max-w-[660px] text-[15px] leading-relaxed text-ink-2">
            Show Brian marketing that worked. He works out why, remembers it, and uses it to come up with ideas for Cashy. He never copies. This is the main Brian, for what&rsquo;s true any day; each campaign below has a Brian of its own.
          </p>
        </header>

        <section className="rounded-[22px] bg-surface p-5 shadow-card sm:p-7">
          <h2 className="mb-4 text-[17px] font-semibold tracking-tight">Teach Brian</h2>
          <TeachBox ai={view.ai} nodes={view.nodes} onNode={openNode} />
        </section>

        {view.questions.slice(0, 1).map((q) => (
          <Question key={q.id} q={q} />
        ))}

        <Campaigns campaigns={view.campaigns} moments={view.lookback.moments} />

        <section className="mt-12">
          <h2 className="mb-3 text-[17px] font-semibold tracking-tight">What Brian has learned</h2>
          <MiniBrain
            nodes={view.nodes}
            examples={view.examples}
            highlight={hover ?? (selected?.type === "node" ? selected.id : null)}
            preview={view.preview}
            counts={[
              { n: of("truth").length, label: "What our audience feels" },
              { n: of("mechanic").length, label: "Why things spread" },
              { n: of("industry").length, label: "What's been done" },
            ]}
            note="Each dot is something he's learned, and lines join things learned from the same example. The more you teach him, the more it takes the shape of a brain."
          />
          <div className="mt-6">
            <KnowledgeColumns
              columns={[
                { title: "What our audience feels", nodes: of("truth") },
                { title: "Why things spread", nodes: of("mechanic") },
                { title: "What's been done", nodes: of("industry") },
              ]}
              onNode={openNode}
              onHover={setHover}
            />
          </div>
        </section>

        <ExampleList title="What you've taught him" examples={view.examples} onExample={(id) => setSelected({ type: "example", id })} onHover={setHover} />
      </main>
      <Drawer selected={selected} setSelected={setSelected} nodes={view.nodes} examples={view.examples} />
    </div>
  );
}

/** Campaign folders, each with its own Brian, and a way to start one. */
function Campaigns({ campaigns, moments }: { campaigns: CampaignCard[]; moments: { title: string; date: string }[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // If the name is a recurring moment (Halloween, Black Friday…), the campaign follows it every year.
  const titles = useMemo(() => [...new Set(moments.map((m) => m.title))], [moments]);
  const moment = titles.find((t) => t.toLowerCase() === name.trim().toLowerCase());
  const suggestions = name.trim().length > 1 && !moment ? titles.filter((t) => t.toLowerCase().includes(name.trim().toLowerCase())).slice(0, 5) : [];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, moment, brief }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Couldn't start that campaign.");
    router.push(`/campaigns/${json.id}`);
  }

  return (
    <section className="mt-12">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">Campaigns</h2>
          <p className="mt-1 max-w-[680px] text-[13.5px] text-ink-2">
            Each campaign has its own Brian. Look at what worked before, teach it what you like, and get ideas, all kept inside the campaign so it never leaks into anything else.
          </p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-medium text-bg hover:opacity-90">
            <Plus className="h-4 w-4" /> New campaign
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={create} className="mb-4 rounded-[22px] bg-surface p-5 shadow-card sm:p-6">
          <label className="mb-1.5 block text-[13px] font-medium text-ink-2">Name</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Halloween, GTA 6 launch, Fish game launch…" className="h-11 w-full rounded-full bg-surface-3 px-4 text-[14.5px] outline-none placeholder:text-ink-3 focus:bg-surface focus:shadow-card" />
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((t) => (
                <button type="button" key={t} onClick={() => setName(t)} className="rounded-full bg-surface-3 px-2.5 py-1 text-[12.5px] text-ink-2 hover:text-ink">
                  {t}
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-[12.5px] text-ink-3">{moment ? `Follows ${moment} every year, so past ${moment}s are one click away.` : "One-off campaigns work too; you can add dates inside it."}</p>
          <label className="mb-1.5 mt-4 block text-[13px] font-medium text-ink-2">What you want from it (optional)</label>
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} placeholder="e.g. Halloween for Cashy's degens: something people share, not another spooky giveaway" className="w-full resize-none rounded-[16px] bg-surface-3 px-4 py-3 text-[14.5px] outline-none placeholder:text-ink-3 focus:bg-surface focus:shadow-card" />
          <div className="mt-4 flex items-center gap-2">
            <button disabled={busy || !name.trim()} className="h-10 rounded-full bg-ink px-5 text-[14px] font-medium text-bg disabled:opacity-40">
              {busy ? "Starting…" : "Start campaign"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="h-10 rounded-full px-4 text-[14px] text-ink-2 hover:text-ink">
              Cancel
            </button>
            {error && <span className="text-[13.5px] text-bad">{error}</span>}
          </div>
        </form>
      )}

      {campaigns.length === 0 && !creating ? (
        <p className="rounded-[16px] border border-dashed border-line-strong p-5 text-[13.5px] text-ink-3">No campaigns yet. Start one for Halloween, say, and teach its Brian from Halloweens gone by.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link href={`/campaigns/${c.id}`} className="block h-full rounded-[20px] bg-surface p-5 shadow-card transition hover:shadow-raised">
                <div className="text-[16px] font-semibold">{c.name}</div>
                <div className="mt-0.5 text-[12.5px] text-ink-3">{c.moment ? `Every ${c.moment}` : c.from ? `${c.from}${c.to ? ` to ${c.to}` : ""}` : "One-off"}</div>
                <div className={clsx("mt-4 flex gap-4 text-[13px] text-ink-2")}>
                  <span>{plural(c.learned, "thing")} learned</span>
                  <span>{plural(c.examples, "example")}</span>
                  <span>{plural(c.ideas, "idea")}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
