"use client";

import clsx from "clsx";
import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RateButtons({ reviewId, itemId, current }: { reviewId: string; itemId: string; current?: { verdict: "run" | "skip"; note?: string } }) {
  const router = useRouter();
  const [note, setNote] = useState(current?.note ?? "");
  const [busy, setBusy] = useState<"run" | "skip" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(verdict: "run" | "skip") {
    setBusy(verdict);
    setError(null);
    const res = await fetch(`/api/review/${reviewId}/rate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, verdict, note }) });
    setBusy(null);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Couldn't save");
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-2 border-t border-line pt-4">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Why? (optional)"
        className="h-9 w-full rounded-full bg-surface-3 px-4 text-[13px] outline-none placeholder:text-ink-3"
      />
      <div className="flex gap-2">
        {(["run", "skip"] as const).map((v) => (
          <button
            key={v}
            onClick={() => send(v)}
            disabled={!!busy}
            className={clsx(
              "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition",
              current?.verdict === v ? (v === "run" ? "bg-good text-white" : "bg-ink text-bg") : "bg-surface-3 text-ink-2 hover:text-ink",
            )}
          >
            {busy === v ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : v === "run" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {v === "run" ? "I'd run this" : "Wouldn't run"}
          </button>
        ))}
      </div>
      {error && <p className="text-[12px] text-bad">{error}</p>}
    </div>
  );
}
