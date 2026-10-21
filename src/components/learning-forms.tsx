"use client";

import clsx from "clsx";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const input = "w-full rounded-[14px] bg-surface-3 px-4 text-[14px] outline-none placeholder:text-ink-3";

/** Paste a campaign or post you think worked. Brian explains why. */
export function LearnForm({ events, ai }: { events: string[]; ai: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [why, setWhy] = useState("");
  const [event, setEvent] = useState("");
  const [owner, setOwner] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/swipes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, why, event, owner: owner || undefined }) });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError(json.error ?? "Couldn't save");
    if (ai && !json.explained) setError("Saved, but Brian couldn't explain it just now. Try Explain on the card.");
    setUrl("");
    setWhy("");
    setEvent("");
    setOwner("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link to a campaign or post that worked: X, TikTok, YouTube, an article" className={clsx(input, "h-10 rounded-full")} />
      <textarea
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        rows={2}
        placeholder="Why you rate it (optional, but it's what Brian learns most from)"
        className={clsx(input, "resize-none py-2.5")}
      />
      <div className="flex flex-wrap gap-2.5">
        <input value={event} onChange={(e) => setEvent(e.target.value)} list="learn-events" placeholder="Made for an event? e.g. Halloween" className={clsx(input, "h-9 max-w-[260px] rounded-full text-[13px]")} />
        <datalist id="learn-events">
          {events.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className={clsx(input, "h-9 w-auto rounded-full text-[13px]")}>
          <option value="">Whose was it?</option>
          <option value="ours">Ours</option>
          <option value="competitor">A competitor&rsquo;s</option>
          <option value="other">Someone else&rsquo;s</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-medium text-bg transition hover:opacity-90 disabled:opacity-45"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {busy ? "Brian is reading it…" : ai ? "Add, and Brian explains it" : "Add"}
        </button>
        {ai && <span className="text-[12px] text-ink-3">About $0.03</span>}
        {error && <span className="text-[12.5px] text-bad">{error}</span>}
      </div>
    </form>
  );
}

/** Tell Brian whether he got it. A note makes him rewrite it. */
export function FeedbackBox({ id, ai }: { id: string; ai: boolean }) {
  const router = useRouter();
  const [verdict, setVerdict] = useState<"right" | "partly" | "wrong" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(v: "right" | "partly" | "wrong") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/learning/${id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verdict: v, note }) });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError(json.error ?? "Couldn't save");
    setVerdict(null);
    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-ink-2">Did Brian get it?</span>
        {(["right", "partly", "wrong"] as const).map((v) => (
          <button
            key={v}
            disabled={busy}
            onClick={() => (v === "right" ? send(v) : setVerdict(v))}
            className={clsx("h-8 rounded-full px-3.5 text-[12.5px] font-medium transition", verdict === v ? "bg-ink text-bg" : "bg-surface-3 text-ink-2 hover:text-ink")}
          >
            {v === "right" ? "Yes, that's it" : v === "partly" ? "Partly" : "No"}
          </button>
        ))}
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-3" />}
      </div>
      {verdict && (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="What did he miss? Your words become the truth he learns from."
            className={clsx(input, "resize-none py-2.5")}
          />
          <div className="flex items-center gap-3">
            <button
              disabled={busy || !note.trim()}
              onClick={() => send(verdict)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-medium text-bg disabled:opacity-45"
            >
              {busy ? "Brian is rewriting it…" : "Send, and Brian rewrites it"}
            </button>
            {ai && <span className="text-[12px] text-ink-3">About $0.03</span>}
          </div>
        </div>
      )}
      {error && <p className="text-[12.5px] text-bad">{error}</p>}
    </div>
  );
}
