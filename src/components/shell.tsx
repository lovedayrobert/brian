"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrianLogo } from "./brain/brian-mark";

/**
 * One slim top bar: Campaigns (home: every campaign's journey from brief to
 * report), Brian (the main brain, learning from the present day), Calendar,
 * and Settings. Rob, 2 Nov: the campaign journey is the product. Older pages
 * (Today, Ideas, Results, Radar) stay reachable by link but aren't in the bar.
 * New features go inside a step of the journey, never as a new item here.
 */
const NAV = [
  { href: "/", label: "Campaigns", also: ["/campaigns"] as string[] },
  { href: "/brian", label: "Brian", also: [] },
  { href: "/calendar", label: "Calendar", also: [] },
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

const ITEM = "rounded-full px-3.5 py-1.5 text-[13.5px] transition-colors";
const ON = "bg-surface font-medium text-ink shadow-card";
const OFF = "text-ink-2 hover:text-ink";

export function Shell({ children, status }: { children: React.ReactNode; status: ShellStatus }) {
  const pathname = usePathname();
  const router = useRouter();
  // The menu closes itself on navigation: it is only open for the path it was opened on.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  if (pathname === "/login") return <main className="px-4">{children}</main>;

  const isActive = (href: string, also: string[] = []) => (href === "/" ? pathname === "/" || also.some((h) => pathname.startsWith(h)) : [href, ...also].some((h) => pathname.startsWith(h)));
  // The journey pages lay themselves out (full-width steppers, full-screen creation and review).
  const bare = pathname === "/" || pathname === "/brian" || pathname.startsWith("/campaigns");
  const low = status.budget != null && status.budgetLeft != null && status.budgetLeft < status.budget * 0.2;
  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-6 lg:px-10">
          <Link href="/" aria-label="Brian" className="shrink-0 hover:opacity-70">
            <BrianLogo />
          </Link>
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {NAV.map((it) => (
              <Link key={it.href} href={it.href} className={clsx(ITEM, isActive(it.href, it.also) ? ON : OFF)}>
                {it.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            {status.budget != null && status.budgetLeft != null && (
              <span className={clsx("mr-2 text-[12.5px]", low ? "text-warn" : "text-ink-3")} title={`AI budget: $${status.budgetLeft.toFixed(2)} of $${status.budget} left`}>
                ${status.budgetLeft.toFixed(2)} left
              </span>
            )}
            <Link
              href="/settings"
              className={clsx(ITEM, isActive("/settings", ["/memory"]) ? ON : OFF)}
            >
              Settings
            </Link>
            {status.auth && (
              <button onClick={signOut} className="px-2 text-[12.5px] text-ink-3 hover:text-ink">
                Sign out
              </button>
            )}
          </div>
          <button aria-label="Open menu" onClick={() => setOpenOn(pathname)} className="ml-auto rounded-full px-3.5 py-1.5 text-[13.5px] font-medium text-ink shadow-card lg:hidden">
            Menu
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <BrianLogo />
            <button aria-label="Close menu" onClick={() => setOpenOn(null)} className="rounded-full px-3.5 py-1.5 text-[13.5px] font-medium shadow-card">
              Close
            </button>
          </div>
          <nav className="flex flex-1 flex-col items-stretch justify-center gap-1 px-6">
            {[...NAV, { href: "/settings", label: "Settings", also: ["/memory"] }].map((it) => (
              <Link key={it.href} href={it.href} className={clsx("rounded-[14px] px-5 py-3.5 text-[18px]", isActive(it.href, it.also) ? "bg-surface font-medium shadow-card" : "text-ink-2")}>
                {it.label}
              </Link>
            ))}
          </nav>
          <div className="flex justify-center gap-8 pb-10 text-[13px] text-ink-3">
            {status.budgetLeft != null && <span>${status.budgetLeft.toFixed(2)} left</span>}
            {status.auth && <button onClick={signOut}>Sign out</button>}
          </div>
        </div>
      )}

      {bare ? (
        children
      ) : (
        <main>
          <div className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</div>
        </main>
      )}
    </div>
  );
}
