"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface Status {
  running: boolean;
  startedAt?: string;
  error?: string;
}

/** Starts a server-side sweep and follows it, including one started before you came to this page. */
export function SweepButton({ label = "Refresh", pending = "Sweeping…" }: { label?: string; pending?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ running: false });
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const follow = useCallback(() => {
    if (timer.current) return;
    timer.current = setInterval(async () => {
      setNow(Date.now());
      const s: Status = await fetch("/api/sweep").then((r) => r.json()).catch(() => ({ running: true }));
      if (!s.running) {
        clearInterval(timer.current!);
        timer.current = null;
        setStatus(s);
        if (s.error) setError(s.error);
        router.refresh();
      }
    }, 3000);
  }, [router]);

  useEffect(() => {
    fetch("/api/sweep")
      .then((r) => r.json())
      .then((s: Status) => {
        setStatus(s);
        if (s.running) follow();
      })
      .catch(() => {});
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [follow]);

  async function start() {
    setError(null);
    const res = await fetch("/api/sweep", { method: "POST" });
    const s = await res.json().catch(() => ({}));
    if (!res.ok) return setError(s.error ?? `Request failed (${res.status})`);
    setStatus(s);
    follow();
  }

  const secs = status.running && status.startedAt ? Math.max(0, Math.round((now - new Date(status.startedAt).getTime()) / 1000)) : 0;
  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={start}
        disabled={status.running}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-surface px-4 text-[13.5px] font-medium text-ink shadow-card transition hover:shadow-raised disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status.running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        {status.running ? `${pending} ${secs}s` : label}
      </button>
      {error && <span className="max-w-[320px] text-[12px] leading-snug text-bad">{error}</span>}
    </span>
  );
}
