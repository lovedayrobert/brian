"use client";

import clsx from "clsx";
import { Check, Copy, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Task } from "@/lib/calendar/types";
import { compact, relativeTime } from "@/lib/format";
import { AUTO, type Stats } from "@/lib/results/platforms";
import type { Publication } from "@/lib/results/publications";
import { campaignSlug, DEFAULT_DESTINATION, trackingLink, UTM_CHANNELS } from "@/lib/results/utm";

/** Inside a task: where it was published, how it's doing, and the tracking links to use. */
export function TaskResults({ task }: { task: Task }) {
  const [pubs, setPubs] = useState<Publication[] | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dest, setDest] = useState(DEFAULT_DESTINATION);
  const [copied, setCopied] = useState<string | null>(null);
  const slug = campaignSlug(task.title, task.id);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/results/publications?taskId=${encodeURIComponent(task.id)}`)
      .then((r) => r.json())
      .then((j) => !cancelled && setPubs(j.publications ?? []))
      .catch(() => !cancelled && setPubs([]));
    return () => {
      cancelled = true;
    };
  }, [task.id]);

  async function add() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/results/publications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: task.id, taskTitle: task.title, taskDate: task.date, ideaId: task.ideaId, url }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(j.error ?? "Couldn't add");
    setPubs((p) => [...(p ?? []), j.publication]);
    setUrl("");
  }

  async function remove(id: string) {
    if (!confirm("Remove this post and its numbers?")) return;
    const res = await fetch(`/api/results/publications/${id}`, { method: "DELETE" });
    if (res.ok) setPubs((p) => (p ?? []).filter((x) => x.id !== id));
  }

  let validDest = true;
  try {
    new URL(dest);
  } catch {
    validDest = false;
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">Published</div>
        {pubs === null ? (
          <p className="text-[13px] text-ink-3">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {pubs.map((p) => (
              <PubRow key={p.id} p={p} onRemove={() => remove(p.id)} onUpdate={(np) => setPubs((all) => (all ?? []).map((x) => (x.id === np.id ? np : x)))} />
            ))}
            {pubs.length === 0 && <li className="text-[13px] text-ink-3">Not published yet. Paste the link once it&rsquo;s out; Brian tracks it at 1 hour, 24 hours and 7 days.</li>}
          </ul>
        )}
        <div className="mt-2 flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://x.com/cashy/status/…" className="h-9 min-w-0 flex-1 rounded-[10px] bg-surface px-3 text-[13.5px] outline-none placeholder:text-ink-3" />
          <button onClick={add} disabled={busy || !url.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-bg disabled:opacity-40">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Add post
          </button>
        </div>
        {error && <p className="mt-1 text-[12.5px] text-bad">{error}</p>}
      </div>

      <div>
        <div className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">Tracking links</div>
        <p className="mb-2 text-[12.5px] text-ink-3">
          Use these instead of plain links so the website numbers (GA4) know this task brought people in. Campaign name: <code className="rounded bg-surface-3 px-1">{slug}</code>
        </p>
        <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Where the link goes" className="mb-2 h-9 w-full rounded-[10px] bg-surface px-3 text-[13.5px] outline-none" />
        {validDest ? (
          <ul className="space-y-1">
            {UTM_CHANNELS.map((ch) => {
              const link = trackingLink(dest, slug, ch, task.id);
              return (
                <li key={ch.source} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-[120px] shrink-0 text-ink-2">{ch.label}</span>
                  <code className="min-w-0 flex-1 truncate rounded bg-surface-3 px-1.5 py-0.5 text-[11.5px] text-ink-2">{link}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(link);
                      setCopied(ch.source);
                      setTimeout(() => setCopied(null), 1500);
                    }}
                    className="rounded-full p-1 text-ink-3 hover:bg-surface-3 hover:text-ink"
                    title="Copy"
                  >
                    {copied === ch.source ? <Check className="h-3.5 w-3.5 text-good" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[12.5px] text-bad">Enter a full link, starting with https://</p>
        )}
      </div>
    </div>
  );
}

const FIELDS: (keyof Stats)[] = ["views", "likes", "reposts", "replies", "saves", "clicks"];
const LABEL: Record<keyof Stats, string> = { views: "views", likes: "likes", reposts: "shares", replies: "comments", saves: "saves", clicks: "clicks" };

function PubRow({ p, onRemove, onUpdate }: { p: Publication; onRemove: () => void; onUpdate: (p: Publication) => void }) {
  const last = p.snapshots[p.snapshots.length - 1];
  const manual = !AUTO.includes(p.platform);
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const stats = Object.fromEntries(Object.entries(vals).filter(([, v]) => v.trim() !== "").map(([k, v]) => [k, Number(v.replace(/[, ]/g, ""))]));
    const res = await fetch(`/api/results/publications/${p.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stats }) });
    setBusy(false);
    if (res.ok) {
      onUpdate((await res.json()).publication);
      setOpen(false);
      setVals({});
    }
  }

  return (
    <li className="rounded-[12px] bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="font-medium">{p.platform}</span>
        <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 truncate text-accent-ink hover:underline">
          <span className="truncate">{p.url.replace(/^https?:\/\/(www\.)?/, "")}</span> <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
        <button onClick={onRemove} className="ml-auto rounded-full p-1 text-ink-3 hover:text-bad" title="Remove">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-ink-2">
        {last ? (
          FIELDS.filter((f) => last[f] !== undefined).map((f) => (
            <span key={f}>
              <span className="font-medium text-ink tabular">{compact(last[f]!)}</span> {LABEL[f]}
            </span>
          ))
        ) : (
          <span className="text-ink-3">{p.error ?? "No numbers yet."}</span>
        )}
        {last && <span className="text-ink-3">· {last.source === "manual" ? "entered" : "read"} {relativeTime(last.at)}</span>}
      </div>
      {(manual || !last) && (
        <button onClick={() => setOpen((o) => !o)} className="mt-1 text-[12px] text-accent-ink hover:underline">
          {open ? "Cancel" : "Enter numbers"}
        </button>
      )}
      {open && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {FIELDS.map((f) => (
            <input key={f} value={vals[f] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [f]: e.target.value }))} placeholder={LABEL[f]} inputMode="numeric" className="h-8 rounded-[8px] bg-surface-3 px-2 text-[12.5px] outline-none" />
          ))}
          <button onClick={save} disabled={busy} className={clsx("col-span-3 h-8 rounded-full bg-ink text-[12.5px] font-medium text-bg", busy && "opacity-50")}>
            Save numbers
          </button>
        </div>
      )}
    </li>
  );
}
