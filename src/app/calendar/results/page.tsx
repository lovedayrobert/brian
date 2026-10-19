import clsx from "clsx";
import { ArrowRight, BarChart3 } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { CALENDAR_TABS, SectionTabs } from "@/components/section-tabs";
import { Card, EmptyState, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { moveName } from "@/lib/brand/quality-bar";
import { compact, relativeTime } from "@/lib/format";
import { ga4Ready, ga4Summary, type Ga4Summary } from "@/lib/integrations/ga4";
import { serviceAccountEmail } from "@/lib/integrations/google";
import { personName } from "@/lib/people";
import { load } from "@/lib/queries";
import { AUTO, engagements, type Platform } from "@/lib/results/platforms";
import { latest, type Publication } from "@/lib/results/publications";

export const metadata = { title: "Results" };

const PERIODS = [7, 28, 90];
const daysAgo = (n: number) => Date.now() - n * 86_400_000;
const hasEng = (s?: { likes?: number; reposts?: number; replies?: number; saves?: number }) => !!s && [s.likes, s.reposts, s.replies, s.saves].some((v) => v !== undefined);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Results: how what we published did, by post, by idea, by channel, plus the website. */
export default async function Results({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: d } = await searchParams;
  const days = PERIODS.includes(Number(d)) ? Number(d) : 28;
  const db = await load();
  const since = daysAgo(days);
  const pubs = (db.publications ?? []).filter((p) => new Date(p.addedAt).getTime() >= since);
  const views = (p: Publication) => latest(p)?.views ?? 0;
  const eng = (p: Publication) => engagements(latest(p));

  let ga: Ga4Summary | null = null;
  let gaError: string | null = null;
  if (ga4Ready()) {
    try {
      ga = await ga4Summary(days);
    } catch (e) {
      gaError = (e as Error).message;
    }
  }

  // By task (a campaign = one calendar task; its posts across platforms).
  const byTask = new Map<string, { title: string; taskId: string; date: string | null; ideaId?: string; campaign: string; pubs: Publication[] }>();
  for (const p of pubs) {
    const g = byTask.get(p.taskId) ?? { title: p.taskTitle, taskId: p.taskId, date: p.taskDate, ideaId: p.ideaId, campaign: p.campaign, pubs: [] };
    g.pubs.push(p);
    byTask.set(p.taskId, g);
  }
  const tasks = [...byTask.values()]
    .map((g) => {
      const idea = g.ideaId ? db.ideas.find((i) => i.id === g.ideaId) : undefined;
      const site = ga?.campaigns.find((c) => c.campaign === g.campaign);
      return { ...g, idea, views: g.pubs.reduce((n, p) => n + views(p), 0), eng: g.pubs.reduce((n, p) => n + eng(p), 0), site };
    })
    .sort((a, b) => b.views - a.views);

  // What works: averages per group, only where there's enough to say anything.
  const MIN = 3;
  const group = <K extends string>(key: (p: Publication) => K | undefined) => {
    const m = new Map<K, Publication[]>();
    for (const p of pubs) {
      const k = key(p);
      if (k) m.set(k, [...(m.get(k) ?? []), p]);
    }
    return [...m.entries()]
      .map(([k, list]) => ({ k, n: list.length, avgViews: Math.round(list.reduce((s, p) => s + views(p), 0) / list.length), avgEng: Math.round(list.reduce((s, p) => s + eng(p), 0) / list.length) }))
      .sort((a, b) => b.avgViews - a.avgViews);
  };
  const byPlatform = group((p) => p.platform);
  const byMove = group((p) => {
    const i = p.ideaId ? db.ideas.find((x) => x.id === p.ideaId) : undefined;
    return i?.attentionMechanic ? moveName(i.attentionMechanic) : undefined;
  });
  const byDay = group((p) => DAYS[(new Date(p.addedAt).getUTCDay() + 6) % 7]);

  const sources: { name: Platform | "GA4"; state: "auto" | "manual" | "needs" }[] = [
    { name: "X", state: "auto" },
    { name: "Telegram", state: "auto" },
    { name: "YouTube", state: process.env.YOUTUBE_API_KEY ? "auto" : "manual" },
    { name: "Instagram", state: "manual" },
    { name: "TikTok", state: "manual" },
    { name: "Discord", state: "manual" },
    { name: "GA4", state: ga4Ready() ? "auto" : "needs" },
  ];

  return (
    <>
      <SectionTabs space="Calendar" tabs={CALENDAR_TABS} active="results" />
      <PageHeader
        title="Results"
        subtitle="How what we published did: every post, every idea, every channel, and what it brought to the website. Paste a post's link into its calendar task and Brian tracks it at 1 hour, 24 hours and 7 days."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-surface p-0.5 shadow-card">
              {PERIODS.map((p) => (
                <Link key={p} href={p === 28 ? "/calendar/results" : `/calendar/results?days=${p}`} className={clsx("rounded-full px-3.5 py-1.5 text-[13px]", days === p ? "bg-ink text-bg" : "text-ink-2 hover:text-ink")}>
                  {p}d
                </Link>
              ))}
            </div>
            <ActionButton endpoint="/api/results/refresh" pending="Reading posts…" variant="secondary">
              Refresh
            </ActionButton>
          </div>
        }
      />

      <div className="mb-8 flex flex-wrap gap-1.5 text-[12px]">
        {sources.map((s) => (
          <span key={s.name} className={clsx("rounded-full px-2.5 py-1", s.state === "auto" ? "bg-good-soft text-good" : s.state === "manual" ? "bg-surface-3 text-ink-2" : "bg-warn-soft text-ink-2")}>
            {s.name}: {s.state === "auto" ? "automatic" : s.state === "manual" ? "numbers by hand for now" : "needs access"}
          </span>
        ))}
      </div>

      {pubs.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="Nothing published in this period"
          body="Open a task in the calendar, use its tracking links in the post, then paste the post's link under Published. Results build up from there."
          action={
            <Link href="/calendar" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-medium text-bg hover:opacity-90">
              Open the calendar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-10">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Posts tracked" value={pubs.length} />
            <Stat label="Views" value={compact(pubs.reduce((n, p) => n + views(p), 0))} />
            <Stat label="Engagements" value={compact(pubs.reduce((n, p) => n + eng(p), 0))} hint="likes, shares, comments, saves" />
            <Stat label="Website visits from them" value={ga ? compact(tasks.reduce((n, t) => n + (t.site?.sessions ?? 0), 0)) : "–"} hint={ga ? `${compact(tasks.reduce((n, t) => n + (t.site?.keyEvents ?? 0), 0))} key events` : "needs GA4"} />
          </div>

          <section>
            <SectionTitle>Top posts</SectionTitle>
            <Card className="divide-y divide-line">
              {[...pubs]
                .sort((a, b) => views(b) - views(a) || eng(b) - eng(a))
                .slice(0, 10)
                .map((p) => {
                  const l = latest(p);
                  return (
                    <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                      <Pill>{p.platform}</Pill>
                      <a href={p.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[14px] font-medium hover:text-accent-ink">
                        {p.taskTitle}
                      </a>
                      <span className="text-[13px] tabular">{l?.views !== undefined ? `${compact(l.views)} views` : "no views yet"}</span>
                      {hasEng(l) ? <span className="text-[13px] tabular text-ink-2">{compact(eng(p))} eng.</span> : <span className="text-[12.5px] text-ink-3">{p.platform} doesn&rsquo;t share likes</span>}
                      {l?.views && hasEng(l) ? <span className="text-[12.5px] tabular text-ink-3">{((eng(p) / l.views) * 100).toFixed(1)}%</span> : null}
                      <span className="text-[12px] text-ink-3">
                        {personName(db, p.addedBy)} · {relativeTime(p.addedAt)}
                      </span>
                    </div>
                  );
                })}
            </Card>
          </section>

          <section>
            <SectionTitle>By idea and task</SectionTitle>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead>
                  <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-[0.05em] text-ink-3">
                    <th className="px-5 py-2.5 font-medium">Task</th>
                    <th className="px-3 py-2.5 font-medium">Posts</th>
                    <th className="px-3 py-2.5 text-right font-medium">Views</th>
                    <th className="px-3 py-2.5 text-right font-medium">Eng.</th>
                    <th className="px-3 py-2.5 text-right font-medium">Visits</th>
                    <th className="px-3 py-2.5 text-right font-medium">Key events</th>
                    <th className="px-5 py-2.5 font-medium">Brian predicted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {tasks.map((t) => (
                    <tr key={t.taskId}>
                      <td className="max-w-[280px] px-5 py-2.5">
                        <Link href={t.date ? `/calendar?d=${t.date}` : "/calendar"} className="block truncate font-medium hover:text-accent-ink">
                          {t.title}
                        </Link>
                        {t.idea && (
                          <Link href={`/ideas/${t.idea.id}`} className="text-[12px] text-ink-3 hover:text-accent-ink">
                            {t.idea.attentionMechanic ? moveName(t.idea.attentionMechanic) : "Brian idea"}
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-ink-2">{[...new Set(t.pubs.map((p) => p.platform))].join(", ")}</td>
                      <td className="px-3 py-2.5 text-right tabular">{compact(t.views)}</td>
                      <td className="px-3 py-2.5 text-right tabular">{compact(t.eng)}</td>
                      <td className="px-3 py-2.5 text-right tabular">{t.site ? compact(t.site.sessions) : "–"}</td>
                      <td className="px-3 py-2.5 text-right tabular">{t.site ? compact(t.site.keyEvents) : "–"}</td>
                      <td className="px-5 py-2.5 text-[12.5px] text-ink-2">{t.idea?.scores.charge ? `feeling ${t.idea.scores.charge.value}/10 · spread ${t.idea.scores.spread?.value ?? "–"}/10` : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>

          <section>
            <SectionTitle>What works</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-3">
              <Breakdown title="By channel" rows={byPlatform} min={MIN} />
              <Breakdown title="By type of idea" rows={byMove} min={MIN} />
              <Breakdown title="By day posted" rows={byDay} min={MIN} />
            </div>
          </section>
        </div>
      )}

      <section className="mt-10">
        <SectionTitle>Website (GA4)</SectionTitle>
        {ga ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Sessions" value={compact(ga.totals.sessions)} />
              <Stat label="Users" value={compact(ga.totals.users)} hint={`${compact(ga.totals.newUsers)} new`} />
              <Stat label="Key events" value={compact(ga.totals.keyEvents)} hint="sign-ups and other conversions" />
              <Stat label="Blog page views" value={compact(ga.blog.reduce((n, b) => n + b.views, 0))} hint="top 15 pages" />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <List title="Top sources" rows={ga.sources.map((s) => [s.source, `${compact(s.sessions)} visits · ${compact(s.keyEvents)} events`])} />
              <List title="Top campaigns" rows={ga.campaigns.slice(0, 12).map((c) => [c.campaign, `${compact(c.sessions)} visits · ${compact(c.keyEvents)} events`])} />
              <List title="Top blog pages" rows={ga.blog.map((b) => [b.path, `${compact(b.views)} views`])} />
            </div>
            <p className="text-[12px] text-ink-3">Read {relativeTime(ga.at)}. Updates hourly.</p>
          </div>
        ) : (
          <Card className="p-5 text-[13.5px] leading-relaxed text-ink-2">
            {gaError ? (
              <p className="text-bad">{gaError}</p>
            ) : (
              <>
                <p>GA4 isn&rsquo;t connected yet. Once it is, this shows visits, users, sign-ups (key events), top sources, every campaign&rsquo;s traffic and the blog&rsquo;s top pages, and each task above gets its own visits and sign-ups.</p>
                {serviceAccountEmail() && (
                  <p className="mt-2">
                    Add <code className="rounded bg-surface-3 px-1">{serviceAccountEmail()}</code> as a Viewer on the GA4 property, then set GA4_PROPERTY_ID.
                  </p>
                )}
              </>
            )}
          </Card>
        )}
      </section>

      <p className="mt-8 text-[12px] text-ink-3">
        Brian reads {AUTO.join(", ")} posts by itself. Instagram, TikTok and Discord numbers are entered on the task until their access is connected.
      </p>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-[12.5px] text-ink-2">{label}</div>
      <div className="display tabular mt-0.5 text-[26px]">{value}</div>
      {hint && <div className="text-[11.5px] text-ink-3">{hint}</div>}
    </Card>
  );
}

function Breakdown({ title, rows, min }: { title: string; rows: { k: string; n: number; avgViews: number; avgEng: number }[]; min: number }) {
  const enough = rows.filter((r) => r.n >= min);
  return (
    <Card className="p-4">
      <div className="mb-2 text-[12.5px] font-medium">{title}</div>
      {enough.length ? (
        <ul className="space-y-1.5 text-[13px]">
          {enough.map((r) => (
            <li key={r.k} className="flex items-center justify-between gap-2">
              <span className="truncate">{r.k}</span>
              <span className="shrink-0 tabular text-ink-2">
                {compact(r.avgViews)} views · {compact(r.avgEng)} eng. <span className="text-ink-3">({r.n})</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12.5px] text-ink-3">Needs at least {min} posts per group to say anything.</p>
      )}
    </Card>
  );
}

function List({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <Card className="p-4">
      <div className="mb-2 text-[12.5px] font-medium">{title}</div>
      <ul className="space-y-1.5 text-[13px]">
        {rows.map(([a, b]) => (
          <li key={a} className="flex items-center justify-between gap-2">
            <span className="truncate">{a}</span>
            <span className="shrink-0 tabular text-ink-2">{b}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-ink-3">Nothing yet.</li>}
      </ul>
    </Card>
  );
}
