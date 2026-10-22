"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrianLogo } from "./brain/brian-mark";

/**
 * One slim top bar across the whole app, in Brian's own style (after
 * Bittensor): his logo, then every area in small mono capitals. Brian is the
 * home screen; the other areas are one click away from anywhere. New features
 * go inside an existing area, never as a new item here. See CLAUDE.md.
 */
const NAV = [
  { href: "/", label: "Brian", also: [] as string[] },
  { href: "/home", label: "Today", also: [] },
  { href: "/ideas", label: "Ideas", also: ["/develop", "/mockups", "/review"] },
  { href: "/calendar", label: "Calendar", also: [] },
  { href: "/results", label: "Results", also: [] },
  { href: "/radar", label: "Radar", also: [] },
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

const MONO = "font-[family-name:var(--font-fira)] text-[12px] uppercase tracking-[0.14em]";

export function Shell({ children, status }: { children: React.ReactNode; status: ShellStatus }) {
  const pathname = usePathname();
  const router = useRouter();
  // The menu closes itself on navigation: it is only open for the path it was opened on.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  if (pathname === "/login") return <main className="px-4">{children}</main>;

  const isActive = (href: string, also: string[] = []) => (href === "/" ? pathname === "/" : [href, ...also].some((h) => pathname.startsWith(h)));
  const brian = pathname === "/";
  const low = status.budget != null && status.budgetLeft != null && status.budgetLeft < status.budget * 0.2;
  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className={clsx("min-h-dvh", brian && "bg-white")}>
      <header className="sticky top-0 z-30 border-b border-[#ececec] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-8 px-6 text-[#141414] sm:px-10">
          <Link href="/" aria-label="Brian" className="shrink-0 hover:opacity-70">
            <BrianLogo />
          </Link>
          <nav className="hidden flex-1 items-center gap-7 lg:flex">
            {NAV.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={clsx(MONO, "border-b py-1 transition-colors", isActive(it.href, it.also) ? "border-[#141414] text-[#141414]" : "border-transparent text-[#8a8a8a] hover:text-[#141414]")}
              >
                {it.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-7 lg:flex">
            {status.budget != null && status.budgetLeft != null && (
              <span className={clsx(MONO, low ? "text-[#141414]" : "text-[#8a8a8a]")} title={`AI budget: $${status.budgetLeft.toFixed(2)} of $${status.budget} left`}>
                ${status.budgetLeft.toFixed(2)} left
              </span>
            )}
            <Link
              href="/settings"
              className={clsx(MONO, "border-b py-1", isActive("/settings", ["/memory"]) ? "border-[#141414] text-[#141414]" : "border-transparent text-[#8a8a8a] hover:text-[#141414]")}
            >
              Settings
            </Link>
            {status.auth && (
              <button onClick={signOut} className={clsx(MONO, "text-[#8a8a8a] hover:text-[#141414]")}>
                Sign out
              </button>
            )}
          </div>
          <button aria-label="Open menu" onClick={() => setOpenOn(pathname)} className={clsx(MONO, "ml-auto lg:hidden")}>
            Menu
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white text-[#141414] lg:hidden">
          <div className="flex h-16 items-center justify-between px-6">
            <BrianLogo />
            <button aria-label="Close menu" onClick={() => setOpenOn(null)} className={MONO}>
              Close
            </button>
          </div>
          <nav className="flex flex-1 flex-col items-center justify-center gap-8">
            {[...NAV, { href: "/settings", label: "Settings", also: ["/memory"] }].map((it) => (
              <Link key={it.href} href={it.href} className={clsx("font-[family-name:var(--font-fira)] text-[18px] uppercase tracking-[0.14em]", isActive(it.href, it.also) ? "underline underline-offset-8" : "")}>
                {it.label}
              </Link>
            ))}
          </nav>
          <div className={clsx(MONO, "flex justify-center gap-8 pb-10 text-[#8a8a8a]")}>
            {status.budgetLeft != null && <span>${status.budgetLeft.toFixed(2)} left</span>}
            {status.auth && <button onClick={signOut}>Sign out</button>}
          </div>
        </div>
      )}

      {brian ? (
        children
      ) : (
        <main>
          <div className="mx-auto w-full max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</div>
        </main>
      )}
    </div>
  );
}
