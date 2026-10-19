"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { relativeTime } from "@/lib/format";

interface C {
  id: string;
  by: string;
  name: string;
  at: string;
  text: string;
}

/** A comment thread. On Linear tasks it reads and writes Linear's own comments. */
export function Comments({ type, id, me, admin, people }: { type: "idea" | "swipe" | "task"; id: string; me: string; admin: boolean; people: { id: string; name: string }[] }) {
  const [list, setList] = useState<C[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linear, setLinear] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/comments?type=${type}&id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setList(j.comments ?? []);
        setLinear(!!j.linear);
      })
      .catch(() => !cancelled && setList([]));
    return () => {
      cancelled = true;
    };
  }, [type, id]);

  async function post() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, text }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(j.error ?? "Couldn't post");
    setList((l) => [...(l ?? []), j.comment]);
    setText("");
  }

  async function remove(cid: string) {
    const res = await fetch(`/api/comments/${cid}`, { method: "DELETE" });
    if (res.ok) setList((l) => (l ?? []).filter((c) => c.id !== cid));
  }

  // Suggest names after "@".
  const at = text.match(/@(\w*)$/);
  const suggestions = at ? people.filter((p) => p.id !== me && p.name.toLowerCase().startsWith(at[1].toLowerCase())).slice(0, 5) : [];

  return (
    <div id="comments" className="scroll-mt-24">
      {list === null ? (
        <p className="text-[13px] text-ink-3">Loading comments…</p>
      ) : (
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id} className="group flex gap-2.5">
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-ink">
                {c.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px]">
                  <span className="font-medium">{c.name}</span> <span className="text-ink-3">{relativeTime(c.at)}</span>
                  {!linear && (c.by === me || admin) && (
                    <button onClick={() => remove(c.id)} className="ml-2 align-middle text-ink-3 opacity-0 hover:text-bad group-hover:opacity-100" title="Delete">
                      <Trash2 className="inline h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-line text-[14px] leading-relaxed">{c.text}</p>
              </div>
            </li>
          ))}
          {list.length === 0 && <li className="text-[13px] text-ink-3">No comments yet.</li>}
        </ul>
      )}
      <div className="relative mt-3">
        <textarea
          ref={box}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post();
          }}
          rows={2}
          placeholder={linear ? "Comment (posted to the Linear issue). Use @ to mention someone" : "Comment. Use @ to mention someone"}
          className="w-full resize-none rounded-[12px] bg-surface-3 px-3.5 py-2.5 text-[14px] outline-none placeholder:text-ink-3"
        />
        {suggestions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                // Keep focus in the box so typing carries on after the name.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const next = text.replace(/@\w*$/, `@${p.name.split(" ")[0]} `);
                  setText(next);
                  requestAnimationFrame(() => {
                    box.current?.focus();
                    box.current?.setSelectionRange(next.length, next.length);
                  });
                }}
                className="rounded-full bg-accent-soft px-2.5 py-1 text-[12.5px] text-accent-ink hover:opacity-80"
              >
                @{p.name}
              </button>
            ))}
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-3">
          <button onClick={post} disabled={busy || !text.trim()} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-bg hover:opacity-90 disabled:opacity-40">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Comment
          </button>
          <span className="text-[11.5px] text-ink-3">⌘ Enter to post</span>
          {error && <span className="text-[12.5px] text-bad">{error}</span>}
        </div>
      </div>
    </div>
  );
}
