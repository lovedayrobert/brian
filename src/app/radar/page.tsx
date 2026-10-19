import { HeartPulse } from "lucide-react";
import { RADAR_TABS, SectionTabs } from "@/components/section-tabs";
import { ActionButton } from "@/components/action-button";
import { Card, EmptyState, PageHeader, Pill, SourceLink } from "@/components/ui";
import { modelReady } from "@/lib/adapters/model";
import { EMOTIONS, emotionName } from "@/lib/brand/quality-bar";
import { relativeTime } from "@/lib/format";
import { load } from "@/lib/queries";

export const metadata = { title: "The room" };

const TONE: Record<string, "bad" | "warn" | "accent" | "good" | undefined> = {
  hate: "bad",
  outrage: "bad",
  disgust: "bad",
  schadenfreude: "warn",
  tribal: "warn",
  wtf: "accent",
  love: "good",
  envy: "accent",
};

export default async function PulsePage() {
  const db = await load();
  const p = db.pulses?.[0];
  const ai = modelReady();

  return (
    <>
      <SectionTabs space="Radar" tabs={RADAR_TABS} active="room" />
      <PageHeader
        title="The room"
        subtitle="What the audience is watching, sharing and arguing about right now, and the feeling behind it: who they love to hate, what made them say wtf, whose fall they're enjoying. Brian aims ideas at these feelings."
        actions={
          <ActionButton endpoint="/api/pulse" pending="Reading the room…" variant="secondary" disabled={!ai} disabledReason={!ai ? "Needs the AI key." : undefined}>
            Read the room (~$0.10)
          </ActionButton>
        }
      />

      {!p ? (
        <EmptyState
          icon={<HeartPulse className="h-5 w-5" />}
          title="No reading yet"
          body="Run a sweep on Live, then Read the room. Brian reads the latest posts from the audience's communities, streamer and creator news, YouTube, the trenches and any imported X feed."
        />
      ) : (
        <>
          <div className="mb-8 grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-3">
              <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">
                The mood · read {relativeTime(p.createdAt)} from {p.signalCount} signals
              </div>
              <p className="mt-2 max-w-[860px] text-[16px] leading-relaxed">{p.mood}</p>
            </Card>
            {p.villain && (
              <Card className="p-5">
                <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-bad">Villain of the week</div>
                <p className="mt-2 text-[14.5px] leading-relaxed">{p.villain}</p>
              </Card>
            )}
            {p.mainCharacter && (
              <Card className="p-5">
                <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-accent-ink">Main character</div>
                <p className="mt-2 text-[14.5px] leading-relaxed">{p.mainCharacter}</p>
              </Card>
            )}
            <Card className="p-5">
              <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Feelings right now</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EMOTIONS.filter((e) => p.items.some((i) => i.emotion === e.id)).map((e) => (
                  <Pill key={e.id} tone={TONE[e.id]}>
                    {e.name} · {p.items.filter((i) => i.emotion === e.id).length}
                  </Pill>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-3">
            {p.items.map((i) => (
              <Card key={i.subject} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={TONE[i.emotion]}>{emotionName(i.emotion)}</Pill>
                  <div className="flex items-center gap-0.5" title={`Intensity ${i.intensity}/10`}>
                    {Array.from({ length: 10 }, (_, n) => (
                      <span key={n} className={`h-1.5 w-2.5 rounded-full ${n < i.intensity ? "bg-ink" : "bg-surface-3"}`} />
                    ))}
                  </div>
                  <span className="text-[12px] text-ink-3">
                    {i.where} · lasts {i.lifespan}
                  </span>
                </div>
                <h3 className="mt-2 text-[16px] font-semibold tracking-tight">{i.subject}</h3>
                <p className="mt-0.5 text-[14px] text-ink-2">{i.happening}</p>
                <p className="mt-2 text-[14px] leading-relaxed">
                  <span className="font-medium">Why people care: </span>
                  {i.why}
                </p>
                {i.opening && (
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-accent-ink">
                    <span className="font-medium">Opening: </span>
                    {i.opening}
                  </p>
                )}
                {i.urls.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                    {i.urls.slice(0, 4).map((u) => (
                      <SourceLink key={u} url={u} />
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
