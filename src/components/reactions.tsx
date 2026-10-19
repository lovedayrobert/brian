"use client";

import clsx from "clsx";
import { useState } from "react";
import { REACTIONS } from "@/lib/collab-types";

/** One-click reactions. Hover a count to see who. Your own reactions are highlighted. */
export function Reactions({
  type,
  id,
  initial,
  me,
  names,
  size = "md",
}: {
  type: "idea" | "swipe" | "task";
  id: string;
  initial: Record<string, string[]>;
  me: string;
  names: Record<string, string>;
  size?: "sm" | "md";
}) {
  const [r, setR] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(emoji: string) {
    if (busy) return;
    setBusy(true);
    // Optimistic: flip it now, then take the server's answer.
    setR((cur) => {
      const who = cur[emoji] ?? [];
      return { ...cur, [emoji]: who.includes(me) ? who.filter((x) => x !== me) : [...who, me] };
    });
    const res = await fetch("/api/reactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, emoji }) });
    if (res.ok) setR((await res.json()).reactions);
    setBusy(false);
  }

  return (
    <span className="flex flex-wrap items-center gap-1">
      {REACTIONS.map((e) => {
        const who = r[e] ?? [];
        const mine = who.includes(me);
        return (
          <button
            key={e}
            type="button"
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              toggle(e);
            }}
            title={who.length ? who.map((w) => (w === me ? "You" : (names[w] ?? w))).join(", ") : "React"}
            className={clsx(
              "inline-flex items-center gap-1 rounded-full border transition",
              size === "sm" ? "h-7 px-2 text-[12.5px]" : "h-8 px-2.5 text-[13.5px]",
              mine ? "border-accent bg-accent-soft text-accent-ink" : who.length ? "border-line bg-surface text-ink-2" : "border-transparent text-ink-3 opacity-70 hover:border-line hover:bg-surface hover:opacity-100",
            )}
          >
            <span>{e}</span>
            {who.length > 0 && <span className="tabular text-[11.5px] font-medium">{who.length}</span>}
          </button>
        );
      })}
    </span>
  );
}
