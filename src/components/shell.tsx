"use client";

import clsx from "clsx";
import {
  Activity,
  BarChart3,
  Brain,
  BrainCircuit,
  CalendarClock,
  ChevronDown,
  FlaskConical,
  Flame,
  Images,
  Layers,
  Lightbulb,
  Menu,
  Rocket,
  Settings,
  Swords,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { relativeTime } from "@/lib/format";

const NAV = [
  {
    group: "Discover",
    items: [
      { href: "/live", label: "Live", icon: Flame },
      { href: "/", label: "Today", icon: CalendarClock },
      { href: "/trends", label: "Trends", icon: Activity },
      { href: "/lab", label: "Lab", icon: FlaskConical },
      { href: "/ideas", label: "Ideas", icon: Lightbulb },
    ],
  },
  {
    group: "Develop",
    items: [
      { href: "/develop", label: "Packages", icon: Layers },
      { href: "/mockups", label: "Mockups", icon: Images },
      { href: "/campaigns", label: "Campaigns", icon: Rocket },
    ],
  },
  {
    group: "Track",
    items: [
      { href: "/competitors", label: "Competitors", icon: Swords },
      { href: "/results", label: "Results", icon: BarChart3 },
      { href: "/memory", label: "Memory", icon: BrainCircuit },
    ],
  },
];

export interface ShellStatus {
  auth: boolean;
  ai: boolean;
  images: boolean;
  lastSweep: string | null;
  liveSources: number;
}

export function Shell({ children, status }: { children: React.ReactNode; status: ShellStatus }) {
  const pathname = usePathname();
  const router = useRouter();
  // The menu closes itself on navigation: it is only open for the path it was opened on.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);

  if (pathname === "/login") return <main className="px-4">{children}</main>;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

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

      <BrandSwitcher />

      <div className="mt-4 flex-1 space-y-5 overflow-y-auto scrollbar-none">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">{g.group}</div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const Icon = it.icon;
                const active = isActive(it.href);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={clsx(
                        "group flex items-center gap-2.5 rounded-[9px] px-3 py-[7px] text-[13.5px] transition-colors",
                        active ? "bg-surface text-ink shadow-card font-medium" : "text-ink-2 hover:bg-surface-3/70 hover:text-ink",
                      )}
                    >
                      <Icon className={clsx("h-4 w-4", active ? "text-accent" : "text-ink-3 group-hover:text-ink-2")} strokeWidth={1.9} />
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="space-y-0.5 border-t border-line pt-3">
        <Link
          href="/settings"
          className={clsx(
            "flex items-center gap-2.5 rounded-[9px] px-3 py-[7px] text-[13.5px] transition-colors",
            isActive("/settings") ? "bg-surface text-ink shadow-card font-medium" : "text-ink-2 hover:bg-surface-3/70 hover:text-ink",
          )}
        >
          <Settings className={clsx("h-4 w-4", isActive("/settings") ? "text-accent" : "text-ink-3")} strokeWidth={1.9} />
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
