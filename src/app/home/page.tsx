import clsx from "clsx";
import { ArrowRight, CalendarRange, Lightbulb, Radar } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { AiBanner } from "@/components/ai-banner";
import { DAY_KIND } from "@/lib/calendar/day-kinds";
import { IdeaCard } from "@/components/idea-card";
import { SweepButton } from "@/components/sweep-button";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { modelReady } from "@/lib/adapters/model";
import { authMode, firstName, SESSION_COOKIE, verifySession } from "@/lib/auth";
import { addDays, shortDate, todayDay } from "@/lib/calendar/dates";
import { getCalendar } from "@/lib/calendar/service";
import type { Task } from "@/lib/calendar/types";
import { relativeTime } from "@/lib/format";
import { initials, personName } from "@/lib/people";
import { breaking, cards, keyVisualFor, load } from "@/lib/queries";

export const metadata = { title: { absolute: "Brian" } };

/** Home: what to do today. Everything here links into Radar, Ideas or Calendar. */
export default async function Home({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { scope: sc } = await searchParams;
  const scope = sc === "mine" ? "mine" : "team";
  const db = await load();
  const ai = modelReady();
  const today = todayDay();
  const user = authMode() === "on" ? (await verifySession((await cookies()).get(SESSION_COOKIE)?.value, process.env.BRIAN_SESSION_SECRET!))?.user : null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // The home team's work: overdue (last two weeks) and the next seven days.
  const team = process.env.LINEAR_TEAM;
  const cal = await getCalendar(addDays(today, -14), addDays(today, 6), { teamKey: team, unscheduled: false });
  // "Mine": tasks assigned to your Linear account (matched by email) or your name.
  const meId = user ?? (authMode() === "off-dev" ? "local" : "");
  const person = db.people?.find((p) => p.id === meId);
  const linearMe = cal.linear.connected ? cal.linear.users.find((u) => u.email && u.email.toLowerCase() === (person?.email ?? meId).toLowerCase()) : undefined;
  const myNames = new Set([linearMe?.name, person?.name].filter(Boolean) as string[]);
  const isMine = (t: Task) => (t.assignee && myNames.has(t.assignee.name)) || t.createdBy === meId;
  const open = cal.tasks.filter((t) => t.status.type !== "completed" && t.status.type !== "canceled" && t.source !== "crm-sheet" && (scope === "team" || isMine(t)));
  const overdue = open.filter((t) => t.date && t.date < today).sort(byDate);
  const dueSoon = open.filter((t) => t.date && t.date >= today).sort(byDate);
  const crmSocial = cal.tasks.filter((t) => t.needsSocial && t.date && t.date >= today);
  const days = (await getCalendar(today, addDays(today, 21), { unscheduled: false })).days;
  const ideas = cards(db.ideas)
    .filter((i) => scope === "team" || i.createdBy === meId)
    .slice(0, 3);
  const feed = (db.activity ?? []).filter((a) => a.type !== "reaction" || scope === "team").slice(0, 12);
  const forYou = (db.activity ?? []).filter((a) => meId && a.mentions?.includes(meId) && a.by !== meId).slice(0, 5);
  const pulse = db.pulses?.[0];
  const news = breaking(db.moments).filter((m) => m.sensitivity !== "blocked" && !m.industry).slice(0, 3);
  const sweep = db.sweeps[0];

  const summary = [
    overdue.length ? `${overdue.length} overdue` : null,
    `${dueSoon.length} task${dueSoon.length === 1 ? "" : "s"} due this week`,
    days[0] ? `${days[0].title} ${days[0].date === today ? "is today" : `on ${shortDate(days[0].date)}`}` : null,
    ideas.length ? `${ideas.length} idea${ideas.length === 1 ? "" : "s"} waiting on you` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        title={`${greeting}, ${firstName(user ?? (authMode() === "off-dev" ? "rob" : null))}`}
        subtitle={summary}
        actions={
          <div className="flex rounded-full bg-surface p-0.5 shadow-card">
            {(["mine", "team"] as const).map((x) => (
              <Link key={x} href={x === "team" ? "/" : "/?scope=mine"} className={clsx("rounded-full px-4 py-1.5 text-[13px] transition", scope === x ? "bg-ink text-bg" : "text-ink-2 hover:text-ink")}>
                {x === "mine" ? "Mine" : "Team"}
              </Link>
            ))}
          </div>
        }
      />

      {forYou.length > 0 && (
        <Card className="mb-6 border-l-[3px] border-l-accent p-4">
          <div className="mb-1.5 text-[11.5px] font-medium uppercase tracking-[0.05em] text-accent-ink">For you</div>
          <ul className="space-y-1.5 text-[13.5px]">
            {forYou.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{personName(db, a.by)}</span> {a.text} <span className="text-ink-3">· {relativeTime(a.at)}</span>
                {a.ref && (
                  <Link href={refHref(a.ref)} className="ml-1 text-accent-ink hover:underline">
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!ai && <AiBanner className="mb-6" />}

      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        <Space href="/radar" icon={Radar} title="Radar" body="What people are watching and feeling right now" cta={pulse ? `Read ${relativeTime(pulse.createdAt)}` : "Read the room"} />
        <Space href="/ideas/new" icon={Lightbulb} title="Get ideas" body="From a spark, a type of idea, or any day in the calendar" cta="Start" />
        <Space href="/calendar" icon={CalendarRange} title="Calendar" body={`Your Linear tasks${team ? ` (${team})` : ""}, the CRM sheet and special days`} cta="Open" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          <section>
            <SectionTitle action={<Link href="/calendar?view=agenda" className="text-[13px] text-accent-ink hover:underline">Calendar</Link>}>
              {scope === "mine" ? "Your week" : `This week${team ? ` in ${team}` : ""}`}
            </SectionTitle>
            <Card className="divide-y divide-line">
              {overdue.length > 0 && <TaskGroup label="Overdue" tone="bad" tasks={overdue.slice(0, 6)} />}
              {dueSoon.length > 0 ? (
                <TaskGroup label="Due" tasks={dueSoon.slice(0, 10)} today={today} />
              ) : (
                <p className="px-5 py-4 text-[13.5px] text-ink-3">{scope === "mine" && !myNames.size ? "Brian can't find your Linear account yet. It matches you by your sign-in email." : "Nothing due this week."}</p>
              )}
              {crmSocial.length > 0 && <TaskGroup label="CRM sends that need social" tone="warn" tasks={crmSocial.slice(0, 5)} />}
            </Card>
            {cal.errors.length > 0 && <p className="mt-2 text-[12.5px] text-bad">{cal.errors.join(" · ")}</p>}
          </section>

          <section>
            <SectionTitle action={<Link href="/ideas" className="text-[13px] text-accent-ink hover:underline">All ideas</Link>}>Ideas waiting on you</SectionTitle>
            {ideas.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {ideas.map((i) => (
                  <IdeaCard key={i.id} idea={i} keyVisualUrl={keyVisualFor(i.id, db.packages)} />
                ))}
              </div>
            ) : (
              <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <p className="text-[13.5px] text-ink-2">No ideas waiting. Point Brian somewhere and it&rsquo;ll come back with ten, and the audience panel keeps the best.</p>
                <Link href="/ideas/new" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-medium text-bg hover:opacity-90">
                  Get ideas <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Card>
            )}
          </section>
        </div>

        <aside className="space-y-10">
          <section>
            <SectionTitle action={<Link href="/radar" className="text-[13px] text-accent-ink hover:underline">Radar</Link>}>The room</SectionTitle>
            <Card className="space-y-3 p-5 text-[13.5px] leading-relaxed">
              {db.autopilot?.last && (
                <p className="rounded-[10px] bg-surface-2 px-3 py-2 text-[12.5px] text-ink-2">
                  <span className="font-medium text-ink">Brian on his own, {relativeTime(db.autopilot.last.at)}:</span> {db.autopilot.last.note}
                  {!!db.autopilot.last.cards && (
                    <Link href="/ideas" className="ml-1 text-accent-ink hover:underline">
                      See them
                    </Link>
                  )}
                </p>
              )}
              {pulse ? (
                <>
                  <p className="line-clamp-4">{pulse.mood}</p>
                  {pulse.villain && (
                    <p>
                      <span className="font-medium text-bad">Villain: </span>
                      {pulse.villain}
                    </p>
                  )}
                  {pulse.mainCharacter && (
                    <p>
                      <span className="font-medium text-accent-ink">Main character: </span>
                      {pulse.mainCharacter}
                    </p>
                  )}
                  <p className="text-[12px] text-ink-3">Read {relativeTime(pulse.createdAt)}</p>
                </>
              ) : (
                <p className="text-ink-2">
                  Brian hasn&rsquo;t read the room yet. <Link href="/radar" className="text-accent-ink hover:underline">Open Radar</Link> and press Read the room.
                </p>
              )}
              {news.length > 0 && (
                <div className="border-t border-line pt-3">
                  <div className="mb-1.5 text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">Breaking</div>
                  {news.map((m) => (
                    <Link key={m.id} href={`/radar/breaking#${m.id}`} className="block py-1 text-[13px] leading-snug hover:text-accent-ink">
                      {m.title}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section>
            <SectionTitle>What the team did</SectionTitle>
            <Card className="divide-y divide-line">
              {feed.length ? (
                feed.map((a) => (
                  <div key={a.id} className="flex gap-2.5 px-4 py-2.5">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent-ink">{initials(personName(db, a.by))}</span>
                    <div className="min-w-0 text-[13px] leading-snug">
                      <span className="font-medium">{personName(db, a.by)}</span> {a.ref ? <Link href={refHref(a.ref)} className="hover:text-accent-ink">{a.text}</Link> : a.text}
                      <div className="text-[11.5px] text-ink-3">{relativeTime(a.at)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-[13px] text-ink-3">Nothing yet. Ideas, comments, reactions and calendar changes show here.</p>
              )}
            </Card>
          </section>

          <section>
            <SectionTitle action={<Link href="/calendar?view=agenda" className="text-[13px] text-accent-ink hover:underline">All</Link>}>Coming up</SectionTitle>
            <Card className="divide-y divide-line">
              {days.slice(0, 7).map((d) => (
                <Link key={d.id} href={`/calendar?d=${d.date}&open=${d.date}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface-2">
                  <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-medium", DAY_KIND[d.kind].cls)}>{DAY_KIND[d.kind].icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{d.title}</span>
                    <span className="block text-[12px] text-ink-3">{d.date === today ? "Today" : shortDate(d.date)} · get ideas</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-ink-3" />
                </Link>
              ))}
            </Card>
          </section>

          <p className="flex items-center gap-2 text-[12px] text-ink-3">
            {sweep ? `Radar updated ${relativeTime(sweep.finishedAt)}` : "Radar hasn't run yet"}
            <SweepButton label="Update" pending="Updating…" />
          </p>
        </aside>
      </div>
    </>
  );
}

function refHref(r: { kind: string; id: string }): string {
  if (r.kind === "idea") return `/ideas/${r.id}`;
  if (r.kind === "swipe") return "/";
  if (r.kind === "memory") return "/memory";
  if (r.kind === "package") return `/develop/${r.id}`;
  return "/calendar";
}

const byDate = (a: Task, b: Task) => (a.date ?? "").localeCompare(b.date ?? "") || (a.priority || 9) - (b.priority || 9);

function Space({ href, icon: Icon, title, body, cta }: { href: string; icon: typeof Radar; title: string; body: string; cta: string }) {
  return (
    <Link href={href} className="group flex flex-col rounded-[18px] bg-surface p-4 shadow-card transition hover:-translate-y-px hover:shadow-raised">
      <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
        <Icon className="h-4 w-4 text-accent" /> {title}
      </span>
      <span className="mt-1 flex-1 text-[13px] leading-snug text-ink-2">{body}</span>
      <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-ink">
        {cta} <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function TaskGroup({ label, tasks, tone, today }: { label: string; tasks: Task[]; tone?: "bad" | "warn"; today?: string }) {
  return (
    <div className="px-5 py-3">
      <div className={clsx("mb-1.5 text-[11.5px] font-medium uppercase tracking-[0.05em]", tone === "bad" ? "text-bad" : tone === "warn" ? "text-[#b4580f]" : "text-ink-3")}>{label}</div>
      <ul className="space-y-1">
        {tasks.map((t) => (
          <li key={t.id}>
            <Link href={t.url ?? `/calendar?d=${t.date}&open=${t.date}`} target={t.url ? "_blank" : undefined} className="flex items-center gap-3 rounded-[8px] py-1 text-[13.5px] hover:text-accent-ink">
              <span className="w-[86px] shrink-0 text-[12px] text-ink-3">{t.date === today ? "Today" : t.date ? shortDate(t.date) : ""}</span>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.status.color ?? "#9ca3af" }} title={t.status.name} />
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              {t.identifier && <span className="shrink-0 text-[11.5px] text-ink-3">{t.identifier}</span>}
              {t.assignee && <span className="hidden shrink-0 text-[12px] text-ink-3 sm:inline">{t.assignee.name.split(" ")[0]}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
