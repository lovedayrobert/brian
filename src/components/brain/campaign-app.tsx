"use client";

import clsx from "clsx";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExampleView, LookbackView, NodeView, QuestionView } from "@/lib/brain-view";
import type { Campaign } from "@/lib/domain/types";
import { LookBack } from "./look-back";
import { Drawer, ExampleList, KnowledgeColumns, MiniBrain, Question, TeachBox, plural } from "./shared";

type Tab = "learn" | "brain" | "ideas";

/**
 * One campaign's page: teach its own Brian (from a link, or from a brand's old
 * posts around the campaign's moment), see what it's learned, and get ideas made
 * only from it plus the main Brian's instincts. Nothing here leaks out unless the
 * team presses "Teach Brian too" on a lesson.
 */
export function CampaignApp({
  campaign,
  ai,
  lookback,
  nodes,
  examples,
  questions,
  ideas,
}: {
  campaign: Campaign;
  ai: boolean;
  lookback: LookbackView;
  nodes: NodeView[];
  examples: ExampleView[];
  questions: QuestionView[];
  ideas: React.ReactNode[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(nodes.length ? "brain" : "learn");
  const [how, setHow] = useState<"history" | "link">(campaign.moment ? "history" : "link");
  const [selected, setSelected] = useState<{ type: "node" | "example"; id: string } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [brief, setBrief] = useState(campaign.brief ?? "");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const of = (...k: NodeView["kind"][]) => nodes.filter((n) => k.includes(n.kind)).sort((a, b) => b.strength - a.strength);
  const openNode = (id: string) => setSelected({ type: "node", id });
  const tabBtn = (t: Tab) => clsx("rounded-full px-4 py-1.5 text-[13.5px] transition", tab === t ? "bg-ink font-medium text-bg" : "text-ink-2 hover:text-ink");

  async function saveBrief() {
    await fetch(`/api/campaigns/${campaign.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief }) });
    setEditing(false);
    router.refresh();
  }

  async function getIdeas() {
    setRunning(true);
    setError(null);
    const res = await fetch("/api/ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id }) });
    const json = await res.json().catch(() => ({}));
    setRunning(false);
    if (!res.ok) return setError(json.error ?? "Couldn't get ideas just now.");
    router.refresh();
  }

  return (
    <div className="text-ink">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Brian
      </Link>
      <header className="mb-6 mt-3">
        <p className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-ink-3">Campaign · its own Brian</p>
        <h1 className="display mt-1 text-[30px] leading-[1.1] sm:text-[34px]">{campaign.name}</h1>
        <p className="mt-1 text-[13.5px] text-ink-3">{campaign.moment ? `Every ${campaign.moment}` : campaign.from ? `${campaign.from}${campaign.to ? ` to ${campaign.to}` : ""}` : "One-off campaign"}</p>
        {editing ? (
          <div className="mt-3 max-w-[680px]">
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} autoFocus placeholder="What the team wants from this campaign" className="w-full resize-none rounded-[16px] bg-surface px-4 py-3 text-[14.5px] shadow-card outline-none" />
            <div className="mt-2 flex gap-2">
              <button onClick={saveBrief} className="h-9 rounded-full bg-ink px-4 text-[13.5px] font-medium text-bg">
                Save
              </button>
              <button onClick={() => setEditing(false)} className="h-9 rounded-full px-3 text-[13.5px] text-ink-2">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-3 max-w-[680px] text-[15px] leading-relaxed text-ink-2">
            {campaign.brief ?? "No brief yet."}{" "}
            <button onClick={() => setEditing(true)} className="text-[13.5px] text-accent-ink hover:underline">
              {campaign.brief ? "Edit" : "Add one"}
            </button>
          </p>
        )}
      </header>

      <div className="mb-4 inline-flex rounded-full bg-surface p-1 shadow-card">
        <button onClick={() => setTab("learn")} className={tabBtn("learn")}>
          Teach it
        </button>
        <button onClick={() => setTab("brain")} className={tabBtn("brain")}>
          What it&rsquo;s learned ({nodes.length})
        </button>
        <button onClick={() => setTab("ideas")} className={tabBtn("ideas")}>
          Ideas ({ideas.length})
        </button>
      </div>

      {tab === "learn" && (
        <section className="rounded-[22px] bg-surface p-5 shadow-card sm:p-7">
          <div className="mb-5 inline-flex rounded-full bg-surface-3 p-1">
            <button onClick={() => setHow("history")} className={clsx("rounded-full px-3.5 py-1.5 text-[13px]", how === "history" ? "bg-surface font-medium shadow-card" : "text-ink-2")}>
              From brands&rsquo; old posts
            </button>
            <button onClick={() => setHow("link")} className={clsx("rounded-full px-3.5 py-1.5 text-[13px]", how === "link" ? "bg-surface font-medium shadow-card" : "text-ink-2")}>
              From a link
            </button>
          </div>
          {how === "history" ? (
            <>
              <p className="mb-5 text-[14px] text-ink-2">
                Pick a brand and a {campaign.moment ? `past ${campaign.moment}` : "moment"} to see what they posted and what else was happening that week. Tick what worked: it&rsquo;s taught to this campaign&rsquo;s Brian only.
              </p>
              <LookBack moments={lookback.moments} brands={lookback.brands} learned={lookback.learned} paid={lookback.paid} ai={ai} campaignId={campaign.id} presetMoment={campaign.moment} />
            </>
          ) : (
            <TeachBox ai={ai} nodes={nodes} campaignId={campaign.id} campaignName={campaign.name} onNode={openNode} />
          )}
        </section>
      )}

      {questions.slice(0, 1).map((q) => (
        <Question key={q.id} q={q} />
      ))}

      {tab === "brain" && (
        <section>
          <MiniBrain
            nodes={nodes}
            examples={examples}
            highlight={hover ?? (selected?.type === "node" ? selected.id : null)}
            counts={[
              { n: of("truth", "mechanic").length, label: "What the audience wants" },
              { n: of("cliche").length, label: "What everyone does" },
              { n: of("industry").length, label: "What brands did" },
            ]}
            note={`Everything here was learned for ${campaign.name} and stays here. If a lesson is true beyond it, open it and press "Teach Brian too".`}
          />
          <div className="mt-6">
            <KnowledgeColumns
              columns={[
                { title: "What the audience wants", nodes: of("truth", "mechanic") },
                { title: "What everyone does (avoid)", nodes: of("cliche") },
                { title: "What brands did, and the gap", nodes: of("industry"), sub: (n) => (n.gap ? `Gap: ${n.gap}` : undefined) },
              ]}
              onNode={openNode}
              onHover={setHover}
            />
          </div>
          <ExampleList title={`What ${campaign.name}'s Brian learned from`} examples={examples} onExample={(id) => setSelected({ type: "example", id })} onHover={setHover} />
          {nodes.length === 0 && (
            <p className="mt-6 rounded-[16px] border border-dashed border-line-strong p-5 text-[13.5px] text-ink-3">
              Nothing learned yet. Go to &ldquo;Teach it&rdquo; and show this campaign&rsquo;s Brian what worked before.
            </p>
          )}
        </section>
      )}

      {tab === "ideas" && (
        <section>
          <div className="flex flex-wrap items-center gap-3 rounded-[22px] bg-surface p-5 shadow-card sm:p-6">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Ideas for {campaign.name}</p>
              <p className="mt-1 text-[13.5px] text-ink-2">
                Built from what this campaign&rsquo;s Brian has learned ({plural(nodes.length, "thing")}) plus the main Brian&rsquo;s instincts, aimed at {campaign.moment ? `the next ${campaign.moment}` : "this campaign"}. About $0.70–1.50 a run.
              </p>
            </div>
            <button disabled={running || !ai} onClick={getIdeas} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-bg hover:opacity-90 disabled:opacity-40">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {running ? "Brian is thinking (a minute or two)…" : "Get ideas"}
            </button>
            {error && <p className="w-full text-[13.5px] text-bad">{error}</p>}
          </div>
          {ideas.length === 0 ? (
            <p className="mt-6 rounded-[16px] border border-dashed border-line-strong p-5 text-[13.5px] text-ink-3">No ideas yet. Teach it first: ideas are only as good as what it&rsquo;s learned.</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{ideas}</div>
          )}
        </section>
      )}

      <Drawer selected={selected} setSelected={setSelected} nodes={nodes} examples={examples} />
    </div>
  );
}
