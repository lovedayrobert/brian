import { Fingerprint } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { LEARNING_TABS, SectionTabs } from "@/components/section-tabs";
import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { modelReady } from "@/lib/adapters/model";
import { relativeTime } from "@/lib/format";
import { confirmed } from "@/lib/learning";
import { load } from "@/lib/queries";

export const metadata = { title: "Cashy's identity" };

/** Who Cashy is as a marketer, built from the team's examples and corrections. */
export default async function IdentityPage() {
  const db = await load();
  const id = db.identity;
  const swipes = db.swipes ?? [];
  const explained = swipes.filter((s) => s.breakdown).length;
  const sure = swipes.filter(confirmed).length;
  const newer = id ? swipes.filter((s) => (s.breakdown?.at ?? "") > id.at || (s.feedback?.at(-1)?.at ?? "") > id.at).length : explained;

  return (
    <>
      <SectionTabs space="Learning" tabs={LEARNING_TABS} active="identity" />
      <PageHeader
        title="Cashy's identity"
        subtitle={`What Brian believes good looks like for Cashy, from ${explained} example${explained === 1 ? "" : "s"} (${sure} confirmed by the team). Every idea run starts from this.`}
        actions={
          <ActionButton endpoint="/api/learning/identity" pending="Brian is thinking…" disabled={!modelReady() || !explained} disabledReason={!explained ? "Add examples in Learning first." : "Connect a model in Settings first."}>
            {id ? "Rebuild" : "Build it"} (about $0.10)
          </ActionButton>
        }
      />
      {!id ? (
        <EmptyState
          icon={<Fingerprint className="h-5 w-5" />}
          title="No identity yet"
          body="Add campaigns you rate in Learning and tell Brian whether he understood them. Then build it here."
        />
      ) : (
        <div className="max-w-[760px] space-y-8">
          <p className="text-[12.5px] text-ink-3">
            Built {relativeTime(id.at)} from {id.basedOn} examples.{newer > 0 && ` ${newer} new or corrected since; rebuild to include them.`}
          </p>
          <Card className="p-5 text-[15px] leading-relaxed">{id.summary}</Card>
          <section>
            <SectionTitle>What we love</SectionTitle>
            <Card className="divide-y divide-line">
              {id.taste.map((t) => (
                <p key={t} className="px-5 py-3 text-[14px]">
                  {t}
                </p>
              ))}
            </Card>
          </section>
          <section>
            <SectionTitle>Lessons</SectionTitle>
            <Card className="divide-y divide-line">
              {id.lessons.map((l) => (
                <div key={l.lesson} className="px-5 py-3.5">
                  <p className="text-[14.5px] font-medium leading-snug">{l.lesson}</p>
                  <p className="mt-1 text-[13px] text-ink-2">{l.why}</p>
                  {!!l.examples.length && <p className="mt-1 text-[12px] text-ink-3">From: {l.examples.join("; ")}</p>}
                </div>
              ))}
            </Card>
          </section>
          <section>
            <SectionTitle>What doesn&rsquo;t work for us</SectionTitle>
            <Card className="divide-y divide-line">
              {id.avoid.map((a) => (
                <p key={a} className="px-5 py-3 text-[14px]">
                  {a}
                </p>
              ))}
            </Card>
          </section>
          <p className="text-[13px] text-ink-3">
            Rules the team has written directly live in{" "}
            <Link href="/memory" className="text-accent-ink hover:underline">
              What Brian has learned
            </Link>
            .
          </p>
        </div>
      )}
    </>
  );
}
