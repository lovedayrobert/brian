"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CampaignBrief } from "@/lib/domain/types";

const GOALS = ["Buzz people talk about", "New sign-ups", "First deposits", "Bring players back", "Grow our Telegram and X", "Brand love"];
const AUDIENCES = ["Degens and high rollers", "Crypto natives", "Sports bettors", "Streamer audiences", "Casual players", "Lapsed players", "Our VIPs"];
const CHANNELS = ["X", "Telegram", "TikTok", "Instagram", "YouTube", "Discord", "Email and CRM", "Website", "Streamers"];

type Answers = CampaignBrief & { brief?: string; from?: string; to?: string };
type Screen = "goals" | "audience" | "angle" | "channels" | "limits" | "timing" | "writeup";
const SCREENS: Screen[] = ["goals", "audience", "angle", "channels", "limits", "timing", "writeup"];

/**
 * The brief as a conversation: one question at a time, mostly tap-to-answer,
 * saved as you go. At the end Brian writes it back in one paragraph; once the
 * team agrees, it's the campaign's north star.
 */
export function BriefFlow({ campaignId, name, moment, momentDate, initial, ai }: { campaignId: string; name: string; moment?: string; momentDate?: string; initial: Answers; ai: boolean }) {
  const router = useRouter();
  const [a, setA] = useState<Answers>({ ...initial, goals: initial.goals ?? [], audience: initial.audience ?? [], channels: initial.channels ?? [] });
  const [i, setI] = useState(initial.agreedAt ? SCREENS.length - 1 : 0);
  const [saving, setSaving] = useState(false);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const screen = SCREENS[i];

  const save = async (patch: Partial<Answers>) => {
    setSaving(true);
    await fetch(`/api/campaigns/${campaignId}/brief`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).catch(() => {});
    setSaving(false);
  };
  const patchFor = (s: Screen): Partial<Answers> =>
    s === "goals" ? { goals: a.goals, goalNote: a.goalNote ?? "" } : s === "audience" ? { audience: a.audience } : s === "angle" ? { angle: a.angle ?? "" } : s === "channels" ? { channels: a.channels } : s === "limits" ? { musts: a.musts ?? "", nogos: a.nogos ?? "" } : s === "timing" ? { from: a.from ?? "", to: a.to ?? "" } : {};

  async function write() {
    setWriting(true);
    setError(null);
    const res = await fetch(`/api/campaigns/${campaignId}/brief`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setWriting(false);
    if (!res.ok) return setError(json.error ?? "Brian couldn't write it up just now.");
    setA((x) => ({ ...x, brief: json.brief }));
  }

  // Arriving at the write-up with fresh answers, Brian writes it straight away.
  const goTo = (n: number, fresh = false) => {
    setI(n);
    if (SCREENS[n] === "writeup" && ai && (fresh || !a.brief)) void write();
  };

  const next = async () => {
    await save(patchFor(screen));
    goTo(Math.min(SCREENS.length - 1, i + 1), screen === "timing" && !initial.agreedAt);
  };
  const back = () => setI((n) => Math.max(0, n - 1));

  async function agree() {
    setSaving(true);
    await save({ brief: a.brief ?? "", agreedAt: new Date().toISOString() });
    router.push(`/campaigns/${campaignId}/research`);
    router.refresh();
  }

  const toggle = (key: "goals" | "audience" | "channels", v: string) => setA((x) => ({ ...x, [key]: x[key].includes(v) ? x[key].filter((y) => y !== v) : [...x[key], v] }));

  return (
    <div className="mx-auto max-w-[780px]">
      <div className="mb-8 flex items-center gap-1.5" aria-label={`Question ${i + 1} of ${SCREENS.length}`}>
        {SCREENS.map((s, n) => (
          <button key={s} onClick={() => goTo(n)} aria-label={`Go to question ${n + 1}`} className={clsx("h-1.5 flex-1 rounded-full transition", n < i ? "bg-ink" : n === i ? "bg-ink/60" : "bg-surface-3")} />
        ))}
      </div>

      <div key={screen} className="min-h-[360px] animate-[rise_.45s_ease-out]">
        <p className="text-[13px] font-medium text-ink-3">
          {screen === "writeup" ? "Brian's write-up" : `Question ${i + 1} of ${SCREENS.length - 1}`}
        </p>

        {screen === "goals" && (
          <Q title="What's it for?" hint="Pick everything that matters. This is how we'll judge it at the end.">
            <Chips options={GOALS} chosen={a.goals} onToggle={(v) => toggle("goals", v)} onAdd={(v) => setA((x) => ({ ...x, goals: [...x.goals, v] }))} />
            <TextArea value={a.goalNote} onChange={(v) => setA((x) => ({ ...x, goalNote: v }))} placeholder="Anything more specific? e.g. 2,000 new Telegram members, or people quoting it for a week" />
          </Q>
        )}
        {screen === "audience" && (
          <Q title="Who's it for?" hint="The people it has to land with. Brian's ideas will be judged by how they'd react.">
            <Chips options={AUDIENCES} chosen={a.audience} onToggle={(v) => toggle("audience", v)} onAdd={(v) => setA((x) => ({ ...x, audience: [...x.audience, v] }))} />
          </Q>
        )}
        {screen === "angle" && (
          <Q title="What's it around, and what's the angle?" hint={moment ? `It follows ${moment}. What do you want Cashy's ${moment} to be about?` : "The idea, product, launch or moment at its heart, and what you want it to say."}>
            <TextArea
              big
              autoFocus
              value={a.angle}
              onChange={(v) => setA((x) => ({ ...x, angle: v }))}
              placeholder={moment ? `e.g. ${moment}, but not another spooky giveaway: something degens share because it's genuinely funny or scary` : "e.g. launching the fish game: the first casino game that feels like a real arcade"}
            />
          </Q>
        )}
        {screen === "channels" && (
          <Q title="Where will it run?" hint="So ideas fit the places we can actually post.">
            <Chips options={CHANNELS} chosen={a.channels} onToggle={(v) => toggle("channels", v)} onAdd={(v) => setA((x) => ({ ...x, channels: [...x.channels, v] }))} />
          </Q>
        )}
        {screen === "limits" && (
          <Q title="Anything it must have, or must never do?" hint="Leave blank if not. Brian treats the no-gos as hard lines.">
            <label className="mt-6 block text-[13.5px] font-medium text-ink-2">It must…</label>
            <TextArea value={a.musts} onChange={(v) => setA((x) => ({ ...x, musts: v }))} placeholder="e.g. tie back to the Justice Fund, or use our mascot" />
            <label className="mt-5 block text-[13.5px] font-medium text-ink-2">It must never…</label>
            <TextArea value={a.nogos} onChange={(v) => setA((x) => ({ ...x, nogos: v }))} placeholder="e.g. mention a rival by name, or make promises about winnings" />
          </Q>
        )}
        {screen === "timing" && (
          <Q title="When does it run?" hint={momentDate ? `${moment} is on ${new Date(`${momentDate}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}. Add the run around it if you know it.` : "Rough dates are fine. You can change them later."}>
            <div className="mt-6 grid max-w-[460px] grid-cols-2 gap-3">
              <label className="text-[13px] text-ink-2">
                Starts
                <input type="date" value={a.from ?? ""} onChange={(e) => setA((x) => ({ ...x, from: e.target.value }))} className="mt-1 h-12 w-full rounded-[14px] bg-surface px-4 text-[15px] shadow-card outline-none focus:shadow-raised" />
              </label>
              <label className="text-[13px] text-ink-2">
                Ends
                <input type="date" value={a.to ?? ""} onChange={(e) => setA((x) => ({ ...x, to: e.target.value }))} className="mt-1 h-12 w-full rounded-[14px] bg-surface px-4 text-[15px] shadow-card outline-none focus:shadow-raised" />
              </label>
            </div>
          </Q>
        )}
        {screen === "writeup" && (
          <div>
            <h2 className="display mt-2 text-[30px] leading-[1.15] sm:text-[36px]">Here&rsquo;s how I understand {name}.</h2>
            <p className="mt-2 text-[15px] text-ink-2">Edit anything that isn&rsquo;t right. Once you agree, this is the north star for everything Brian does on this campaign.</p>
            <div className="relative mt-7 rounded-[24px] bg-surface p-6 shadow-raised sm:p-8">
              <Sparkles className="absolute -top-3 left-6 h-6 w-6 rounded-full bg-ink p-1 text-bg" />
              {writing ? (
                <div className="space-y-3 py-2">
                  <p className="text-[14px] text-ink-3">Brian is writing it up…</p>
                  {[92, 85, 70].map((w) => (
                    <div key={w} className="shimmer h-4 rounded-full" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : (
                <textarea
                  value={a.brief ?? ""}
                  onChange={(e) => setA((x) => ({ ...x, brief: e.target.value }))}
                  rows={6}
                  placeholder={ai ? "" : "Write the brief in a paragraph: what it's for, who for, the angle, where and when."}
                  className="w-full resize-none bg-transparent font-[family-name:var(--font-voice,inherit)] text-[19px] leading-relaxed outline-none"
                />
              )}
            </div>
            {error && <p className="mt-3 text-[14px] text-bad">{error}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={agree} disabled={saving || writing || !a.brief?.trim()} className="inline-flex h-14 items-center gap-2 rounded-full bg-ink px-7 text-[16px] font-medium text-bg shadow-raised transition hover:opacity-90 disabled:opacity-30">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} That&rsquo;s right, start the research
              </button>
              {ai && (
                <button onClick={write} disabled={writing} className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-[14.5px] text-ink-2 transition hover:bg-surface hover:text-ink hover:shadow-card">
                  <RefreshCw className="h-4 w-4" /> Rewrite from my answers
                </button>
              )}
              <button onClick={() => setI(0)} className="text-[14px] text-accent-ink hover:underline">
                Change my answers
              </button>
            </div>
          </div>
        )}
      </div>

      {screen !== "writeup" && (
        <div className="mt-10 flex items-center justify-between">
          <button onClick={back} disabled={i === 0} className="inline-flex h-12 items-center gap-2 rounded-full px-4 text-[15px] text-ink-2 transition hover:text-ink disabled:invisible">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-4">
            {saving && <span className="text-[12.5px] text-ink-3">Saving…</span>}
            <button onClick={next} className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-bg shadow-card transition hover:opacity-90">
              {screen === "timing" ? "See Brian's write-up" : "Next"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Q({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="display mt-2 text-[30px] leading-[1.15] sm:text-[38px]">{title}</h2>
      <p className="mt-2 text-[15.5px] text-ink-2">{hint}</p>
      {children}
    </div>
  );
}

function Chips({ options, chosen, onToggle, onAdd }: { options: string[]; chosen: string[]; onToggle: (v: string) => void; onAdd: (v: string) => void }) {
  const [adding, setAdding] = useState("");
  const all = [...options, ...chosen.filter((c) => !options.includes(c))];
  return (
    <div className="mt-7 flex flex-wrap gap-2.5">
      {all.map((o) => {
        const on = chosen.includes(o);
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={clsx("inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] transition", on ? "bg-ink font-medium text-bg shadow-raised" : "bg-surface text-ink shadow-card hover:-translate-y-px hover:shadow-raised")}
          >
            {on && <Check className="h-4 w-4" strokeWidth={2.5} />}
            {o}
          </button>
        );
      })}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (adding.trim()) onAdd(adding.trim());
          setAdding("");
        }}
        className="inline-flex h-12 items-center gap-1.5 rounded-full border border-dashed border-line-strong pl-4 pr-1.5"
      >
        <Plus className="h-4 w-4 text-ink-3" />
        <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Something else" className="w-[140px] bg-transparent text-[15px] outline-none placeholder:text-ink-3" />
      </form>
    </div>
  );
}

function TextArea({ value, onChange, placeholder, big, autoFocus }: { value?: string; onChange: (v: string) => void; placeholder: string; big?: boolean; autoFocus?: boolean }) {
  return (
    <textarea
      value={value ?? ""}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      rows={big ? 5 : 2}
      placeholder={placeholder}
      className={clsx("mt-4 w-full resize-none rounded-[18px] bg-surface px-5 py-4 shadow-card outline-none transition placeholder:text-ink-3 focus:shadow-raised", big ? "text-[19px] leading-relaxed" : "text-[15.5px]")}
    />
  );
}
