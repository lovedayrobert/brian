"use client";

import clsx from "clsx";
import { Check, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Thumbs up/down with an optional reason. A reason becomes a memory straight
 * away; a bare thumb is kept for consolidation. On ideas, a thumbs-down can
 * also reject the card.
 */
export function FeedbackBar({
  target,
  allowReject,
}: {
  target: { type: "idea" | "package"; id: string; label: string };
  allowReject?: boolean;
}) {
  const router = useRouter();
  const [sentiment, setSentiment] = useState<"up" | "down" | null>(null);
  const [reason, setReason] = useState("");
  const [reject, setReject] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!sentiment) return;
    setState("saving");
    setError(null);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, sentiment, reason: reason.trim() || undefined, reject: sentiment === "down" && reject }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Couldn't save");
      setState("idle");
      return;
    }
    setState("saved");
    router.refresh();
  }

  if (state === "saved")
    return (
      <div className="flex items-center gap-2 rounded-[14px] bg-good-soft px-4 py-3 text-[13px] text-good">
        <Check className="h-4 w-4" /> Brian will remember that.{" "}
        <a href="/memory" className="font-medium underline-offset-2 hover:underline">
          See Memory
        </a>
      </div>
    );

  return (
    <div className="rounded-[14px] bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-medium">Your verdict</span>
        <div className="flex gap-1.5">
          {(["up", "down"] as const).map((s) => {
            const Icon = s === "up" ? ThumbsUp : ThumbsDown;
            return (
              <button
                key={s}
                onClick={() => setSentiment(s)}
                aria-label={s === "up" ? "Good" : "Not for us"}
                className={clsx(
                  "grid h-8 w-8 place-items-center rounded-full transition",
                  sentiment === s ? (s === "up" ? "bg-good text-white" : "bg-bad text-white") : "bg-surface-3 text-ink-2 hover:text-ink",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
        <span className="text-[12px] text-ink-3">Brian learns from every verdict.</span>
      </div>
      {sentiment && (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder={sentiment === "up" ? "What's good about it? (optional, but it's how Brian learns your taste)" : "What's wrong with it? (optional, but it's how Brian learns your taste)"}
            className="w-full resize-none rounded-[12px] bg-surface-3 px-3 py-2 text-[13px] outline-none placeholder:text-ink-3"
          />
          <div className="flex flex-wrap items-center gap-3">
            {allowReject && sentiment === "down" && (
              <label className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                <input type="checkbox" checked={reject} onChange={(e) => setReject(e.target.checked)} /> Also remove it from the shortlist
              </label>
            )}
            <button
              onClick={save}
              disabled={state === "saving"}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bg disabled:opacity-50"
            >
              {state === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </button>
          </div>
          {error && <p className="text-[12px] text-bad">{error}</p>}
        </div>
      )}
    </div>
  );
}
