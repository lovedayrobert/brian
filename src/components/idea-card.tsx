import Link from "next/link";
import type { Idea } from "@/lib/domain/types";
import { EdgeBadge, Pill } from "./ui";
import { KeyVisual } from "./mockups/key-visual";
import { scoreSet } from "@/lib/scores";
import { HORIZON_COPY, horizonFor } from "@/lib/horizon";
import { emotionName, moveName } from "@/lib/brand/quality-bar";

export function IdeaCard({ idea, keyVisualUrl }: { idea: Idea; keyVisualUrl?: string | null }) {
  return (
    <Link
      href={`/ideas/${idea.id}`}
      className="group flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-card transition hover:-translate-y-px hover:shadow-raised"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <KeyVisual line={idea.name} imageUrl={keyVisualUrl} className="h-full w-full" compact />
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5 pl-24">
          <Pill tone={horizonFor(idea) === "reactive" ? "warn" : "accent"}>{HORIZON_COPY[horizonFor(idea)].badge}</Pill>
          <EdgeBadge edge={idea.edge} />
          {idea.status === "developing" && <Pill tone="accent">Developing</Pill>}
          {idea.status === "developed" && <Pill tone="good">Package ready</Pill>}
          {idea.sample && <Pill tone="warn">Sample</Pill>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {idea.attentionMechanic && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Pill>{moveName(idea.attentionMechanic)}</Pill>
            {idea.emotion && <Pill tone={["hate", "outrage", "disgust"].includes(idea.emotion) ? "bad" : "accent"}>{emotionName(idea.emotion)}</Pill>}
          </div>
        )}
        <h3 className="text-[17px] font-semibold leading-snug tracking-tight">{idea.name}</h3>
        {idea.effort && <p className="mt-2 text-[12px] text-ink-3">{idea.effort}</p>}
        {idea.shareMoment && (
          <div className="mt-4 rounded-[12px] bg-surface-2 px-3.5 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">What people say sharing it</div>
            <div className="mt-1 text-[15px] font-medium leading-snug">&ldquo;{idea.shareMoment}&rdquo;</div>
          </div>
        )}
        {idea.reactions && idea.reactions.length > 0 && (
          <div className="mt-3 text-[12px] text-ink-3">
            {idea.reactions.filter((r) => r.shares).length} of {idea.reactions.length} on the panel would share it
          </div>
        )}
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
