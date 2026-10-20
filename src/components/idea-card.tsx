import Link from "next/link";
import type { Idea } from "@/lib/domain/types";
import { EdgeBadge, Pill } from "./ui";
import { scoreSet } from "@/lib/scores";
import { emotionName } from "@/lib/brand/quality-bar";

export const SIZE_NAME: Record<NonNullable<Idea["size"]>, string> = { reply: "Reply", post: "Post", meme: "Meme", act: "Real act", campaign: "Campaign" };

/** An idea at a glance: how big it is, the idea, and the exact words when it's a post. No placeholder images. */
export function IdeaCard({ idea, keyVisualUrl }: { idea: Idea; keyVisualUrl?: string | null }) {
  return (
    <Link
      href={`/ideas/${idea.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[20px] bg-surface shadow-card transition hover:-translate-y-px hover:shadow-raised"
    >
      {/* A real image only: the old code-drawn placeholder looked the same on every idea. */}
      {keyVisualUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={keyVisualUrl} alt="" className="aspect-[16/9] w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {idea.size && <Pill tone={idea.size === "act" || idea.size === "campaign" ? "accent" : undefined}>{SIZE_NAME[idea.size]}</Pill>}
          {idea.emotion && <Pill tone={["hate", "outrage", "disgust"].includes(idea.emotion) ? "bad" : undefined}>{emotionName(idea.emotion)}</Pill>}
          <EdgeBadge edge={idea.edge} />
          {idea.status === "developing" && <Pill tone="accent">Developing</Pill>}
          {idea.status === "developed" && <Pill tone="good">Package ready</Pill>}
        </div>
        <h3 className="text-[16.5px] font-semibold leading-snug tracking-tight">{idea.name}</h3>
        {idea.post && (
          <div className="mt-3 whitespace-pre-line rounded-[12px] bg-surface-2 px-3.5 py-3 text-[14.5px] leading-snug">{idea.post}</div>
        )}
        {!idea.post && idea.shareMoment && (
          <div className="mt-3 rounded-[12px] bg-surface-2 px-3.5 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">What people say sharing it</div>
            <div className="mt-1 text-[14.5px] font-medium leading-snug">&ldquo;{idea.shareMoment}&rdquo;</div>
          </div>
        )}
        {idea.effort && <p className="mt-3 text-[12px] text-ink-3">{idea.effort}</p>}
        <div className="mt-auto pt-4">
          <div className="grid gap-2 text-center" style={{ gridTemplateColumns: `repeat(${scoreSet(idea).length}, minmax(0, 1fr))` }}>
            {scoreSet(idea).map((k) => (
              <div key={k.key} className="rounded-[10px] bg-surface-2 py-2">
                <div className="tabular text-[16px] font-semibold">{idea.scores[k.key]?.value ?? "–"}</div>
                <div className="text-[11px] text-ink-3">{k.short}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
