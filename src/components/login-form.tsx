"use client";

import { Brain, Loader2 } from "lucide-react";
import { useState } from "react";

export function LoginForm({ next, google, passwords, domain, initialError }: { next: string; google: boolean; passwords: boolean; domain: string; initialError: string | null }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, password }) });
    if (res.ok) {
      window.location.href = next;
      return;
    }
    setError((await res.json().catch(() => ({}))).error ?? "Couldn't sign in");
    setBusy(false);
  }

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <form onSubmit={submit} className="w-full max-w-[360px] rounded-[22px] bg-surface p-7 shadow-raised">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-[11px] bg-ink text-bg">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[17px] font-semibold tracking-tight">Brian</div>
            <div className="text-[12px] text-ink-2">Sign in to continue</div>
          </div>
        </div>
        {google && (
          <a href={`/api/auth/google?next=${encodeURIComponent(next)}`} className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full bg-ink text-[14px] font-medium text-bg hover:opacity-90">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
            </svg>
            Sign in with Google
          </a>
        )}
        {google && <p className="mt-2 text-center text-[12px] text-ink-3">Only @{domain} accounts</p>}
        {google && passwords && <div className="my-5 border-t border-line" />}
        {passwords && (
        <>
        <label className="block text-[12.5px] text-ink-2">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" autoFocus className="mt-1 h-10 w-full rounded-[10px] bg-surface-3 px-3 text-[14px] text-ink outline-none focus:ring-2 focus:ring-accent" />
        </label>
        <label className="mt-3 block text-[12.5px] text-ink-2">
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="mt-1 h-10 w-full rounded-[10px] bg-surface-3 px-3 text-[14px] text-ink outline-none focus:ring-2 focus:ring-accent" />
        </label>
        <button disabled={busy || !name || !password} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bg disabled:opacity-40">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
        </>
        )}
        {error && <p className="mt-3 text-[12.5px] text-bad">{error}</p>}
      </form>
    </div>
  );
}
