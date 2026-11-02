"use client";

import Link from "next/link";
import { useState } from "react";
import type { ExampleView, LookbackView, NodeView, QuestionView } from "@/lib/brain-view";
import { Drawer, ExampleList, KnowledgeColumns, MiniBrain, Question, TeachBox } from "./shared";

export interface BrainView {
  ai: boolean;
  lookback: LookbackView;
  /** ?brain=0..1 shows the brain at a given stage of growth, to preview it (the knowledge shown stays real) */
  preview?: number;
  nodes: NodeView[];
  questions: QuestionView[];
  examples: ExampleView[];
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
            Show Brian marketing that worked. He works out why, remembers it, and uses it to come up with ideas for Cashy. He never copies. This is the main Brian, learning from the present day and what&rsquo;s true any day. Each campaign has a Brian of its own, on the{" "}
            <Link href="/" className="text-accent-ink hover:underline">
              Campaigns
            </Link>{" "}
            page.
          </p>
        </header>

        <section className="rounded-[22px] bg-surface p-5 shadow-card sm:p-7">
          <h2 className="mb-4 text-[17px] font-semibold tracking-tight">Teach Brian</h2>
          <TeachBox ai={view.ai} nodes={view.nodes} onNode={openNode} />
        </section>

        {view.questions.slice(0, 1).map((q) => (
          <Question key={q.id} q={q} />
        ))}


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
