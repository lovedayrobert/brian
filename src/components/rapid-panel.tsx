import { Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import type { RapidResponse } from "@/lib/pipeline/rapid";
import { ActionButton } from "./action-button";
import { EdgeBadge, Pill } from "./ui";

export function RapidPanel({ rr }: { rr: RapidResponse }) {
  return (
    <div className="border-t border-line bg-surface-2 p-5">
      <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Three takes</div>
      <div className="grid gap-3 md:grid-cols-3">
        {rr.takes.map((t, i) => (
          <div
            key={i}
            className={`flex flex-col rounded-[14px] bg-surface p-4 shadow-card ${rr.chosen === i ? "ring-2 ring-accent" : ""}`}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <EdgeBadge edge={t.edge} />
              {t.redLine.pass ? (
                <Pill tone="good">
                  <ShieldCheck className="h-3 w-3" /> Red lines OK
                </Pill>
              ) : (
                <Pill tone="bad">
                  <ShieldAlert className="h-3 w-3" /> Red line
                </Pill>
              )}
            </div>
            <p className="text-[14px] font-medium leading-snug">{t.take}</p>
            <p className="mt-1.5 text-[12.5px] text-ink-2">Format: {t.format}</p>
            <p className="mt-2 text-[12.5px] leading-snug text-ink-3">{t.riskNote}</p>
            {!t.redLine.pass && <p className="mt-2 text-[12.5px] text-bad">{t.redLine.note}</p>}
            {rr.chosen === null && t.redLine.pass && (
              <div className="mt-auto pt-3">
                <ActionButton endpoint={`/api/rapid/${rr.id}/assets`} body={{ take: i }} size="sm" variant="secondary" pending="Writing assets…">
                  Approve and build assets
                </ActionButton>
              </div>
            )}
          </div>
        ))}
      </div>

      {rr.assets && (
        <div className="mt-5 rounded-[14px] bg-surface p-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[15px] font-semibold">Post-ready assets</div>
            <Pill tone="accent">
              <Clock className="h-3 w-3" /> {rr.assets.postingTime}
            </Pill>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Asset label="X">
              <p>{rr.assets.x.post}</p>
              <p className="mt-2 text-ink-3">Variant: {rr.assets.x.altVariant}</p>
            </Asset>
            <Asset label="Instagram feed">
              <p className="text-ink-3">Visual: {rr.assets.instagramFeed.visual}</p>
              <p className="mt-2">{rr.assets.instagramFeed.caption}</p>
            </Asset>
            <Asset label="Instagram story">
              <ol className="list-decimal space-y-1 pl-4">
                {rr.assets.instagramStory.frames.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ol>
            </Asset>
            <Asset label="TikTok">
              <p className="font-medium">{rr.assets.tiktok.hook}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink-2">
                {rr.assets.tiktok.beats.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              <p className="mt-2">{rr.assets.tiktok.caption}</p>
            </Asset>
            <Asset label="Telegram">{rr.assets.telegram}</Asset>
            <Asset label="Discord">{rr.assets.discord}</Asset>
          </div>
          <div className="mt-4 grid gap-3 border-t border-line pt-4 text-[13px] md:grid-cols-2">
            <div>
              <div className="text-[12px] text-ink-3">Visual direction</div>
              <div className="mt-0.5">{rr.assets.visualDirection}</div>
            </div>
            <div>
              <div className="text-[12px] text-ink-3">Risk note</div>
              <div className="mt-0.5">{rr.assets.riskNote}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Asset({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-line p-3.5 text-[13.5px] leading-relaxed">
      <div className="mb-1.5 text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">{label}</div>
      <div className="whitespace-pre-line">{children}</div>
    </div>
  );
}
