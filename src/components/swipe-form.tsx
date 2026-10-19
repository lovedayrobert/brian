"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Paste a link and say why it's clever. */
export function SwipeForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/swipes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, why }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Couldn't save");
    setUrl("");
    setWhy("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Link to the post: X, TikTok, YouTube, anything"
        className="h-10 w-full rounded-full bg-surface-3 px-4 text-[14px] outline-none placeholder:text-ink-3"
      />
      <textarea
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        rows={2}
        placeholder="Why is it clever? e.g. “so simple, one real act, riding GTA hype”"
        className="w-full resize-none rounded-[16px] bg-surface-3 px-4 py-2.5 text-[14px] outline-none placeholder:text-ink-3"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !url.trim() || !why.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-medium text-bg transition hover:opacity-90 disabled:opacity-45"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add to swipe file
        </button>
        {error && <span className="text-[12.5px] text-bad">{error}</span>}
      </div>
    </form>
  );
}

/** Start from the team's own idea or a swiped post. */
export function SparkBox({ swipeId, disabled, compact }: { swipeId?: string; disabled: boolean; compact?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spark: text, swipeId }) });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError(json.error ?? "Couldn't run");
    router.push(json.id ? `/ideas/${json.id}` : "/ideas");
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={compact ? 1 : 3}
        disabled={disabled || busy}
        placeholder={swipeId ? "Optional: which direction? e.g. “same energy, for GTA 6 launch”" : "A half-idea, a direction, or “they did X, could we do something like it?”"}
        className="w-full resize-none rounded-[16px] bg-surface-3 px-4 py-2.5 text-[14px] outline-none placeholder:text-ink-3 disabled:opacity-50"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={disabled || busy || (!swipeId && !text.trim())}
          title={disabled ? "Needs the AI key" : undefined}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-medium text-bg transition hover:opacity-90 disabled:opacity-45"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {busy ? "Brian is working on it…" : swipeId ? "Riff on this" : "Develop this"}
        </button>
        {error && <span className="text-[12.5px] text-bad">{error}</span>}
      </div>
    </div>
  );
}
