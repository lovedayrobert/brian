"use client";

import clsx from "clsx";
import { ArrowRight, CalendarDays, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Moment = { title: string; date: string; why: string };
const nice = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const field = "h-12 w-full rounded-[14px] bg-surface px-4 text-[15px] shadow-card outline-none focus:shadow-raised";

/**
 * Starting a campaign: one big question. Recurring moments suggest themselves
 * as you type (so Halloween follows Halloween every year); anything else is a
 * one-off with its own dates.
 */
export function NewCampaign({ upcoming }: { upcoming: Moment[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [moment, setMoment] = useState<Moment | null>(null);
  const [oneOff, setOneOff] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = name.trim().toLowerCase();
  const matches = useMemo(() => (q ? upcoming.filter((m) => m.title.toLowerCase().includes(q)).slice(0, 5) : upcoming.slice(0, 6)), [q, upcoming]);

  const pick = (m: Moment) => {
    setMoment(m);
    setName(m.title);
    setOneOff(false);
  };

  async function start(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, moment: moment?.title, from: oneOff ? from : undefined, to: oneOff ? to : undefined }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(json.error ?? "Couldn't start that campaign.");
    }
    router.push(`/campaigns/${json.id}/brief`);
  }

  return (
    <main className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[720px] flex-col justify-center px-5 py-16">
      <Link href="/" aria-label="Cancel" className="absolute right-5 top-6 grid h-10 w-10 place-items-center rounded-full text-ink-3 transition hover:bg-surface hover:text-ink hover:shadow-card">
        <X className="h-5 w-5" />
      </Link>
      <p className="animate-[rise_.5s_ease-out] text-[13px] font-medium uppercase tracking-[0.08em] text-ink-3">New campaign</p>
      <form onSubmit={start} className="animate-[rise_.6s_ease-out]">
        <label htmlFor="name" className="display mt-3 block text-[34px] leading-[1.1] sm:text-[44px]">
          What&rsquo;s the campaign?
        </label>
        <input
          id="name"
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (moment && e.target.value !== moment.title) setMoment(null);
          }}
          placeholder="Halloween, GTA 6 launch, the fish game…"
          className="mt-8 w-full border-b-2 border-line-strong bg-transparent pb-3 text-[28px] font-medium tracking-tight outline-none transition placeholder:text-ink-3/60 focus:border-ink sm:text-[32px]"
        />
      </form>

      <div className="mt-6 min-h-[150px] animate-[rise_.7s_ease-out]">
        {moment ? (
          <div className="flex items-center gap-3 rounded-[18px] bg-surface p-4 shadow-card">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent-ink">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">Follows {moment.title} every year</p>
              <p className="text-[13px] text-ink-3">Next one {nice(moment.date)}. Past {moment.title}s will be one click away in research.</p>
            </div>
          </div>
        ) : (
          !oneOff &&
          matches.length > 0 && (
            <>
              <p className="mb-2.5 text-[12.5px] text-ink-3">{q ? "Is it one of these?" : "Coming up"}</p>
              <div className="flex flex-wrap gap-2">
                {matches.map((m) => (
                  <button key={m.title} type="button" onClick={() => pick(m)} className="rounded-full bg-surface px-4 py-2 text-left text-[14px] shadow-card transition hover:-translate-y-px hover:shadow-raised">
                    <span className="font-medium">{m.title}</span>
                    <span className="ml-2 text-[12.5px] text-ink-3">{nice(m.date).replace(/ \d{4}$/, "")}</span>
                  </button>
                ))}
              </div>
            </>
          )
        )}
        {!moment && (
          <div className="mt-5">
            <button type="button" onClick={() => setOneOff(!oneOff)} className="text-[14px] text-accent-ink hover:underline">
              {oneOff ? "It follows a moment after all" : "It's a one-off with its own dates"}
            </button>
            {oneOff && (
              <div className="mt-3 grid animate-[rise_.3s_ease-out] grid-cols-2 gap-3">
                <label className="text-[12.5px] text-ink-2">
                  Starts
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={clsx(field, "mt-1")} />
                </label>
                <label className="text-[12.5px] text-ink-2">
                  Ends
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={clsx(field, "mt-1")} />
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button
          onClick={() => start()}
          disabled={busy || !name.trim()}
          className="inline-flex h-14 items-center gap-2 rounded-full bg-ink px-7 text-[16px] font-medium text-bg shadow-raised transition hover:opacity-90 disabled:opacity-30"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Continue to the brief <ArrowRight className="h-5 w-5" />
        </button>
        {error && <p className="text-[14px] text-bad">{error}</p>}
      </div>
    </main>
  );
}
