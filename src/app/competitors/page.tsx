import { Swords } from "lucide-react";
import Link from "next/link";
import { Card, EmptyState, PageHeader, SourceLink } from "@/components/ui";
import { relativeTime } from "@/lib/format";
import { load } from "@/lib/queries";

export const metadata = { title: "Competitors" };

const RIVALS = ["Stake", "Shuffle", "Rollbit", "Roobet", "BC.Game", "Rainbet", "Duel"];

export default async function Competitors() {
  const db = await load();
  const mentions = db.signals
    .filter((s) => ["press", "related"].includes(s.sourceId) || s.id.startsWith("gdelt-article:"))
    .map((s) => ({ s, rivals: RIVALS.filter((r) => new RegExp(`\\b${r.replace(".", "\\.")}\\b`, "i").test(`${s.title} ${s.summary ?? ""}`)) }))
    .filter((x) => x.rivals.length);
  return (
    <>
      <PageHeader
        title="Competitors"
        subtitle="What rivals are doing, from press coverage today. Their socials, sites and launch tracking arrive with the crawl and X sources in Phase 3."
      />
      <div className="mb-8 flex flex-wrap gap-2">
        {RIVALS.map((r) => (
          <span key={r} className="rounded-full bg-surface px-3.5 py-1.5 text-[13px] shadow-card">
            {r} <span className="text-ink-3">{mentions.filter((m) => m.rivals.includes(r)).length}</span>
          </span>
        ))}
      </div>
      {mentions.length ? (
        <Card className="divide-y divide-line">
          {mentions.map(({ s, rivals }) => (
            <div key={s.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-accent-ink">{rivals.join(", ")}</div>
                <div className="mt-0.5 text-[14px] leading-snug">{s.title}</div>
                <div className="mt-0.5 text-[12px] text-ink-3">
                  {s.author ?? s.sourceId}
                  {s.publishedAt ? ` · ${relativeTime(s.publishedAt)}` : ""}
                </div>
              </div>
              <SourceLink url={s.url} className="shrink-0" />
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState icon={<Swords className="h-5 w-5" />} title="No competitor coverage in this sweep" body={<Link href="/live" className="text-accent-ink">See what&rsquo;s breaking</Link>} />
      )}
    </>
  );
}
