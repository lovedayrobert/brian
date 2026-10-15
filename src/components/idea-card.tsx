import Link from "next/link";
import type { Idea } from "@/lib/domain/types";
import { EdgeBadge, Pill } from "./ui";
import { KeyVisual } from "./mockups/key-visual";
import { scoreSet } from "@/lib/scores";

export function IdeaCard({ idea, keyVisualUrl }: { idea: Idea; keyVisualUrl?: string | null }) {
  return (
    <Link
      href={`/ideas/${idea.id}`}
      className="group flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-card transition hover:-translate-y-px hover:shadow-raised"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <KeyVisual line={idea.name} imageUrl={keyVisualUrl} className="h-full w-full" compact />
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5 pl-24">
          <EdgeBadge edge={idea.edge} />
          {idea.status === "developing" && <Pill tone="accent">Developing</Pill>}
          {idea.status === "developed" && <Pill tone="good">Package ready</Pill>}
          {idea.origin === "lab" && <Pill tone="accent">Original</Pill>}
          {idea.sample && <Pill tone="warn">Sample</Pill>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[17px] font-semibold leading-snug tracking-tight">{idea.name}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{idea.oneLiner}</p>
        <div className="mt-4 rounded-[12px] bg-surface-2 px-3.5 py-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">The headline</div>
          <div className="mt-1 font-serif text-[15px] italic leading-snug">“{idea.headline}”</div>
        </div>
        <div className="mt-4 grid gap-2 text-center" style={{ gridTemplateColumns: `repeat(${scoreSet(idea).length}, minmax(0, 1fr))` }}>
          {scoreSet(idea).map((k) => (
            <div key={k.key} className="rounded-[10px] bg-surface-2 py-2">
              <div className="tabular text-[17px] font-semibold">{idea.scores[k.key]?.value ?? "–"}</div>
              <div className="text-[11px] text-ink-3">{k.short}</div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
