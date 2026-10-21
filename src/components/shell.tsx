"use client";

import clsx from "clsx";
import { ArrowLeft, BarChart3, Brain, CalendarRange, ChevronDown, Home, Lightbulb, Menu, Radar, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { relativeTime } from "@/lib/format";

/**
 * Brian himself is the home screen (/) with no sidebar. This sidebar is only
 * for the team tools behind him. New features go inside an existing tool,
 * never as a new item here. See CLAUDE.md.
 */
const NAV = [
  { href: "/home", label: "Today", hint: "Tasks and what's coming up", icon: Home, also: [] as string[] },
  { href: "/radar", label: "Radar", hint: "What's happening out there", icon: Radar, also: [] },
  { href: "/ideas", label: "Ideas", hint: "Get ideas, review Brian's", icon: Lightbulb, also: ["/develop", "/mockups", "/review"] },
  { href: "/calendar", label: "Calendar", hint: "Plan and track the work", icon: CalendarRange, also: [] },
  { href: "/results", label: "Results", hint: "How what we published did", icon: BarChart3, also: [] },
];

export interface ShellStatus {
  auth: boolean;
  ai: boolean;
  images: boolean;
  lastSweep: string | null;
  liveSources: number;
  /** AI money left under the budget cap, if one is set */
  budgetLeft?: number | null;
  budget?: number | null;
}

export function Shell({ children, status }: { children: React.ReactNode; status: ShellStatus }) {
  const pathname = usePathname();
  const router = useRouter();
  // The menu closes itself on navigation: it is only open for the path it was opened on.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);

  if (pathname === "/login") return <main className="px-4">{children}</main>;
  // Brian's own screen has no sidebar: it is the product. The team tools sit behind it.
  if (pathname === "/") return <>{children}</>;

  const isActive = (href: string, also: string[] = []) => (href === "/" ? pathname === "/" : [href, ...also].some((h) => pathname.startsWith(h)));

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-3 pb-5 pt-1">
        <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-bg">
          <Brain className="h-[18px] w-[18px]" strokeWidth={2} />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">Brian</div>
          <div className="text-[11px] text-ink-2">Marketing brain</div>
        </div>
      </div>

      <Link href="/" className="mb-3 flex items-center gap-2 rounded-[9px] px-3 py-[7px] text-[13px] text-ink-2 hover:bg-surface-3/70 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to Brian
      </Link>
      <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">Team tools</div>
      <BrandSwitcher />

      <div className="mt-4 flex-1 space-y-5 overflow-y-auto scrollbar-none">
        <ul className="space-y-1">
          {NAV.map((it) => {
            const Icon = it.icon;
            const active = isActive(it.href, it.also);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={clsx(
                    "group flex items-center gap-3 rounded-[11px] px-3 py-2 transition-colors",
                    active ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:bg-surface-3/70 hover:text-ink",
                  )}
                >
                  <Icon className={clsx("h-[18px] w-[18px] shrink-0", active ? "text-accent" : "text-ink-3 group-hover:text-ink-2")} strokeWidth={1.9} />
                  <span className="min-w-0">
                    <span className={clsx("block text-[14px] leading-tight", active && "font-medium")}>{it.label}</span>
                    <span className="block truncate text-[11.5px] leading-tight text-ink-3">{it.hint}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-0.5 border-t border-line pt-3">
        <Link
          href="/settings"
          className={clsx(
            "flex items-center gap-2.5 rounded-[9px] px-3 py-[7px] text-[13.5px] transition-colors",
            isActive("/settings", ["/memory"]) ? "bg-surface text-ink shadow-card font-medium" : "text-ink-2 hover:bg-surface-3/70 hover:text-ink",
          )}
        >
          <Settings className={clsx("h-4 w-4", isActive("/settings", ["/memory"]) ? "text-accent" : "text-ink-3")} strokeWidth={1.9} />
          Settings
        </Link>
        <SystemStatus status={status} />
        {status.auth && (
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
            className="ml-3 text-[11.5px] text-ink-3 hover:text-ink"
          >
            Sign out
          </button>
        )}
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] border-r border-line bg-bg/80 px-2.5 py-4 backdrop-blur-xl lg:block">
        {nav}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/80 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-[8px] bg-ink text-bg">
            <Brain className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Brian</span>
        </Link>
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-3">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[272px] bg-bg px-2.5 py-4 shadow-float">
            <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-full hover:bg-surface-3">
              <X className="h-4 w-4" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <main className="lg:pl-[232px]">
        <div className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</div>
      </main>
    </div>
  );
}

function BrandSwitcher() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative px-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-[10px] bg-surface px-2.5 py-2 text-left shadow-card transition hover:shadow-raised"
      >
        <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-[#0B0B0F] text-[11px] font-bold text-[#2BD96B]">C</span>
        <span className="flex-1 text-[13px] font-medium">Cashy</span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
      </button>
      {open && (
        <div className="absolute inset-x-1 top-full z-10 mt-1.5 rounded-[12px] bg-surface p-1 shadow-float">
          <div className="flex items-center gap-2.5 rounded-[8px] bg-surface-3 px-2.5 py-2 text-[13px] font-medium">
            <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-[#0B0B0F] text-[11px] font-bold text-[#2BD96B]">C</span>
            Cashy
          </div>
          <div className="flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-ink-3">
            <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-[#0E1020] text-[11px] font-bold text-[#F5B800]">B</span>
            BitStarz
            <span className="ml-auto rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px]">Phase 3</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemStatus({ status }: { status: ShellStatus }) {
  return (
    <div className="mt-2 space-y-1.5 rounded-[10px] px-3 py-2.5 text-[11.5px] text-ink-2">
      <Row ok={status.liveSources > 0} label={status.liveSources ? `${status.liveSources} live sources` : "No sweep yet"} />
      <Row ok={status.ai} label={status.ai ? "AI connected" : "AI not connected"} />
      {status.budget != null && status.budgetLeft != null && (
        <Row ok={status.budgetLeft > status.budget * 0.2} label={`AI budget: $${status.budgetLeft.toFixed(2)} of $${status.budget} left`} />
      )}
      <Row ok={status.images} label={status.images ? "Image model connected" : "Images not connected"} neutral />
      {status.lastSweep && (
        <div className="pl-[14px] text-ink-3" suppressHydrationWarning>
          Swept {relativeTime(status.lastSweep)}
        </div>
      )}
    </div>
  );
}

function Row({ ok, label, neutral }: { ok: boolean; label: string; neutral?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={clsx("h-1.5 w-1.5 rounded-full", ok ? "bg-good" : neutral ? "bg-ink-3" : "bg-warn")} />
      {label}
    </div>
  );
}
