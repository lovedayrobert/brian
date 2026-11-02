"use client";

import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ExampleView, LookbackView, NodeView, QuestionView } from "@/lib/brain-view";
import { LookBack, type Research } from "@/components/brain/look-back";
import { Drawer, ExampleList, KnowledgeColumns, MiniBrain, Question, TeachBox } from "@/components/brain/shared";

/**
 * Step 2, Research: it can run for days. Everything found here (a brand's old
 * posts around the moment, a link someone shares) teaches this campaign's Brian
 * only; what it learns builds up underneath, ready for the ideas step.
 */
export function ResearchStep({
  campaign,
  ai,
  lookback,
  nodes,
  examples,
  questions,
  research,
}: {
  campaign: { id: string; name: string; moment?: string };
  ai: boolean;
  lookback: LookbackView;
  nodes: NodeView[];
  examples: ExampleView[];
  questions: QuestionView[];
  research: Research[];
}) {
  const [how, setHow] = useState<"history" | "link">(campaign.moment ? "history" : "link");
  const [selected, setSelected] = useState<{ type: "node" | "example"; id: string } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const of = (...k: NodeView["kind"][]) => nodes.filter((n) => k.includes(n.kind)).sort((a, b) => b.strength - a.strength);
  const openNode = (id: string) => setSelected({ type: "node", id });
  const ready = nodes.length >= 3;
  const seg = (on: boolean) => clsx("rounded-full px-4 py-2 text-[14px] transition", on ? "bg-surface font-medium shadow-card" : "text-ink-2 hover:text-ink");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="display text-[28px] leading-tight">Research</h2>
          <p className="mt-1.5 max-w-[620px] text-[15px] leading-relaxed text-ink-2">
            Take your time: this can run for days. Everything you find here teaches {campaign.name}&rsquo;s Brian, and nothing else, why it worked.
          </p>
        </div>
        <Link
          href={`/campaigns/${campaign.id}/ideas`}
          className={clsx("inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-medium transition", ready ? "bg-ink text-bg shadow-card hover:opacity-90" : "bg-surface text-ink-2 shadow-card hover:text-ink")}
        >
          {ready ? "Ready for ideas" : `${nodes.length} of 3 lessons for good ideas`} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <section className="mt-6 rounded-[24px] bg-surface p-5 shadow-card sm:p-7">
        <div className="mb-6 inline-flex rounded-full bg-surface-3 p-1">
          <button onClick={() => setHow("history")} className={seg(how === "history")}>
            Brands&rsquo; old posts
          </button>
          <button onClick={() => setHow("link")} className={seg(how === "link")}>
            A link you found
          </button>
        </div>
        {how === "history" ? (
          <LookBack moments={lookback.moments} brands={lookback.brands} learned={lookback.learned} paid={lookback.paid} ai={ai} campaignId={campaign.id} presetMoment={campaign.moment} history={research} />
        ) : (
          <TeachBox ai={ai} nodes={nodes} campaignId={campaign.id} campaignName={campaign.name} onNode={openNode} />
        )}
      </section>

      {questions.slice(0, 1).map((q) => (
        <Question key={q.id} q={q} />
      ))}

      <section className="mt-12">
        <h2 className="mb-3 text-[18px] font-semibold tracking-tight">What {campaign.name}&rsquo;s Brian has learned</h2>
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
        {nodes.length > 0 && (
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
        )}
        <ExampleList title="What it learned from" examples={examples} onExample={(id) => setSelected({ type: "example", id })} onHover={setHover} />
      </section>

      <Drawer selected={selected} setSelected={setSelected} nodes={nodes} examples={examples} />
    </div>
  );
}
