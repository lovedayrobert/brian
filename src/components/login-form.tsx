"use client";

import { Brain, Loader2 } from "lucide-react";
import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <label className="block text-[12.5px] text-ink-2">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" autoFocus className="mt-1 h-10 w-full rounded-[10px] bg-surface-3 px-3 text-[14px] text-ink outline-none focus:ring-2 focus:ring-accent" />
        </label>
        <label className="mt-3 block text-[12.5px] text-ink-2">
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="mt-1 h-10 w-full rounded-[10px] bg-surface-3 px-3 text-[14px] text-ink outline-none focus:ring-2 focus:ring-accent" />
        </label>
        {error && <p className="mt-3 text-[12.5px] text-bad">{error}</p>}
        <button disabled={busy || !name || !password} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bg disabled:opacity-40">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
      </form>
    </div>
  );
}
