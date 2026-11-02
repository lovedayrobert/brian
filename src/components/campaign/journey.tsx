"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** The journey every campaign goes through, in order. */
export const JOURNEY = [
  { id: "brief", label: "Brief", hint: "What we're trying to achieve" },
  { id: "research", label: "Research", hint: "Teach its Brian what worked" },
  { id: "ideas", label: "Ideas", hint: "Brian's ideas, one by one" },
  { id: "plan", label: "Plan", hint: "What to make and when", soon: true },
  { id: "report", label: "Report", hint: "Did it work?", soon: true },
] as const;
export type StepId = (typeof JOURNEY)[number]["id"];

const order = (s: StepId) => JOURNEY.findIndex((j) => j.id === s);

/** The stepper across the top of a campaign: done steps ticked, the current one lit, all clickable. */
export function Stepper({ campaignId, current }: { campaignId: string; current: StepId }) {
  const pathname = usePathname();
  const here = JOURNEY.find((j) => pathname.endsWith(`/${j.id}`))?.id ?? current;
  return (
    <nav aria-label="Campaign journey" className="flex w-full items-stretch gap-1 overflow-x-auto rounded-[20px] bg-surface p-1.5 shadow-card scrollbar-none">
      {JOURNEY.map((j, i) => {
        const done = order(j.id) < order(current);
        const on = j.id === here;
        const body = (
          <>
            <span
              className={clsx(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold transition",
                on ? "bg-bg text-ink" : done ? "bg-good text-white" : "bg-surface-3 text-ink-3",
              )}
            >
              {done && !on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-[14px] font-medium">{j.label}</span>
              <span className={clsx("block truncate text-[11.5px]", on ? "text-bg/70" : "text-ink-3")}>{"soon" in j && j.soon ? "Coming next" : j.hint}</span>
            </span>
          </>
        );
        const cls = clsx("flex min-w-[150px] flex-1 items-center gap-3 rounded-[15px] px-3 py-2.5 text-left transition", on ? "bg-ink text-bg" : "hover:bg-surface-2", "soon" in j && j.soon && !on && "opacity-55");
        return "soon" in j && j.soon ? (
          <span key={j.id} className={clsx(cls, "cursor-default")} title="Coming in the next phase">
            {body}
          </span>
        ) : (
          <Link key={j.id} href={`/campaigns/${campaignId}/${j.id}`} className={cls}>
            {body}
          </Link>
        );
      })}
    </nav>
  );
}

/** The same journey, tiny, for campaign cards. */
export function MiniJourney({ current }: { current: StepId }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`At the ${current} step`}>
      {JOURNEY.map((j) => {
        const done = order(j.id) < order(current);
        const on = j.id === current;
        return <span key={j.id} title={j.label} className={clsx("h-1.5 flex-1 rounded-full", done ? "bg-good" : on ? "bg-ink" : "bg-surface-3")} />;
      })}
    </div>
  );
}
