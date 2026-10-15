import clsx from "clsx";
import { KeyRound } from "lucide-react";
import Link from "next/link";

export function AiBanner({ className }: { className?: string }) {
  return (
    <div className={clsx("flex flex-col gap-3 rounded-[16px] bg-accent-soft px-5 py-4 sm:flex-row sm:items-center", className)}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-accent">
        <KeyRound className="h-4 w-4" />
      </div>
      <div className="flex-1 text-[13.5px] leading-relaxed">
        <span className="font-semibold">Discovery is live. The AI layer is waiting for a key.</span>{" "}
        <span className="text-ink-2">
          Trends, lifecycle stages and breaking moments below are real and update on every sweep. Ideas, Rapid Response and campaign packages switch on when <code className="rounded bg-surface px-1 py-0.5 text-[12px]">ANTHROPIC_API_KEY</code> is added.
        </span>
      </div>
      <Link href="/settings" className="shrink-0 text-[13px] font-medium text-accent-ink hover:underline">
        Set up
      </Link>
    </div>
  );
}
