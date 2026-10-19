import clsx from "clsx";
import Link from "next/link";

/**
 * The four spaces (Home, Radar, Ideas, Calendar) are the whole app. Pages
 * inside a space are tabs, never new sidebar items. See CLAUDE.md.
 */
export const RADAR_TABS = [
  { id: "room", href: "/radar", label: "The room" },
  { id: "breaking", href: "/radar/breaking", label: "Breaking" },
  { id: "trends", href: "/radar/trends", label: "Trends" },
  { id: "rivals", href: "/radar/rivals", label: "Rivals" },
];

export const IDEAS_TABS = [
  { id: "ideas", href: "/ideas", label: "Brian's ideas" },
  { id: "new", href: "/ideas/new", label: "Get ideas" },
  { id: "inspiration", href: "/ideas/inspiration", label: "Inspiration" },
];

export function SectionTabs({ space, tabs, active }: { space: string; tabs: { id: string; href: string; label: string }[]; active: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-[13px] font-medium uppercase tracking-[0.06em] text-ink-3">{space}</span>
      <nav className="flex rounded-full bg-surface p-0.5 shadow-card">
        {tabs.map((t) => (
          <Link key={t.id} href={t.href} className={clsx("rounded-full px-3.5 py-1.5 text-[13px] transition", active === t.id ? "bg-ink text-bg" : "text-ink-2 hover:text-ink")}>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export const SETTINGS_TABS = [
  { id: "team", href: "/settings?tab=team", label: "Team" },
  { id: "coverage", href: "/settings?tab=coverage", label: "Coverage and cost" },
  { id: "sources", href: "/settings?tab=sources", label: "Sources" },
  { id: "brand", href: "/settings?tab=brand", label: "Brand" },
  { id: "models", href: "/settings?tab=models", label: "Models" },
  { id: "memory", href: "/memory", label: "What Brian has learned" },
  { id: "accuracy", href: "/settings?tab=accuracy", label: "Accuracy" },
  { id: "results", href: "/results", label: "Results" },
];
