"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Button that POSTs to an API route, then refreshes or navigates. Shows a
 * progress label while running and the error in place if it fails.
 */
export function ActionButton({
  endpoint,
  body,
  children,
  pending: pendingLabel,
  navigateTo,
  variant = "primary",
  size = "md",
  disabled,
  disabledReason,
  className,
  icon,
  method = "POST",
}: {
  endpoint: string;
  method?: "POST" | "DELETE";
  body?: unknown;
  children: React.ReactNode;
  pending?: string;
  /** Path to go to on success. `{id}` is replaced with the response's id. */
  navigateTo?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  icon?: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
      startTransition(() => {
        if (navigateTo) router.push(navigateTo.replace("{id}", json.id ?? ""));
        else router.refresh();
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const styles = {
    primary: "bg-ink text-bg hover:opacity-85",
    secondary: "border border-ink bg-surface text-ink hover:bg-surface-3",
    ghost: "text-ink underline-offset-4 hover:underline",
  };
  const sizes = { sm: "h-8 px-3 text-[11px]", md: "h-10 px-4 text-[11.5px]" };

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={run}
        disabled={busy || disabled}
        title={disabled ? disabledReason : undefined}
        className={clsx(
          "inline-flex items-center justify-center gap-1.5 font-[family-name:var(--font-fira)] uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-40",
          styles[variant],
          sizes[size],
          className,
        )}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
        {busy ? (pendingLabel ?? "Working…") : children}
      </button>
      {disabled && disabledReason && <span className="max-w-[260px] text-[11.5px] leading-snug text-ink-3">{disabledReason}</span>}
      {error && <span className="max-w-[320px] text-[12px] leading-snug text-bad">{error}</span>}
    </span>
  );
}
