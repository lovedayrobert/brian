"use client";

import clsx from "clsx";
import { Loader2, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Memory, MemoryKind } from "@/lib/memory";

export function TeachBox() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<MemoryKind>("rule");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, kind }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Couldn't save");
    setText("");
    router.refresh();
  }

  return (
    <div className="rounded-[18px] bg-surface p-4 shadow-card">
      <div className="mb-2 text-[14px] font-semibold">Teach Brian</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        rows={2}
        placeholder="e.g. Never show real people's faces. Marko likes ideas that annoy Stake. Keep stunts under $30k."
        className="w-full resize-none rounded-[12px] bg-surface-3 px-3 py-2.5 text-[13.5px] outline-none placeholder:text-ink-3"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full bg-surface-3 p-0.5">
          {(
            [
              ["rule", "Rule"],
              ["preference", "Preference"],
              ["lesson", "Lesson"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={clsx("rounded-full px-3 py-1 text-[12px] transition", kind === k ? "bg-surface font-medium shadow-card" : "text-ink-2")}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="text-[11.5px] text-ink-3">{kind === "rule" ? "A hard requirement" : kind === "preference" ? "A taste to lean towards" : "Something learned from experience"}</span>
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bg disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Remember this
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] text-bad">{error}</p>}
    </div>
  );
}

export function MemoryItem({ m }: { m: Memory }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.text);
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/memory/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  const source = { taught: "Taught by you", feedback: "From your feedback", behaviour: "From what you did", consolidated: "Learned from patterns" }[m.source];

  return (
    <div className={clsx("group px-4 py-3.5", !m.active && "opacity-50")}>
      {editing ? (
        <div className="space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="w-full resize-none rounded-[10px] bg-surface-3 px-3 py-2 text-[13.5px] outline-none" />
          <div className="flex gap-2">
            <button onClick={() => patch({ text })} className="h-7 rounded-full bg-ink px-3 text-[12px] font-medium text-bg">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="h-7 rounded-full px-3 text-[12px] text-ink-2">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[14px] leading-snug">{m.text}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-ink-3">
              <span>{source}</span>
              <span>·</span>
              <span>{new Date(m.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              <span>·</span>
              <span>{m.usedCount ? `Used ${m.usedCount} time${m.usedCount === 1 ? "" : "s"}` : "Not used yet"}</span>
              {m.weight > 1 && (
                <>
                  <span>·</span>
                  <span>Backed by {m.weight} signals</span>
                </>
              )}
              {!m.active && <span className="font-medium text-warn">Paused</span>}
            </div>
          </div>
          <div className="flex shrink-0 gap-0.5 opacity-60 transition group-hover:opacity-100">
            {busy ? (
              <Loader2 className="m-1.5 h-4 w-4 animate-spin text-ink-3" />
            ) : (
              <>
                <IconBtn label="Edit" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn label={m.active ? "Pause" : "Switch on"} onClick={() => patch({ active: !m.active })}>
                  {m.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </IconBtn>
                <IconBtn label="Forget" onClick={() => confirm("Forget this memory? Brian will stop using it.") && patch({ forget: true })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className="grid h-7 w-7 place-items-center rounded-full text-ink-2 hover:bg-surface-3 hover:text-ink">
      {children}
    </button>
  );
}
