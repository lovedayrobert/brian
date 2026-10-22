import clsx from "clsx";
import Link from "next/link";

/**
 * Brian is the home screen (/); the team tools (Home, Radar, Ideas, Calendar, Results) sit behind it. Pages
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
];


export function SectionTabs({ space, tabs, active }: { space: string; tabs: { id: string; href: string; label: string }[]; active: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-line">
      <span className="mono-label pb-3 text-ink-3">{space}</span>
      <nav className="flex flex-wrap gap-x-6">
        {tabs.map((t) => (
          <Link key={t.id} href={t.href} className={clsx("mono-label -mb-px border-b pb-3 transition", active === t.id ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink")}>
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
  { id: "memory", href: "/memory", label: "Rules" },
  { id: "accuracy", href: "/settings?tab=accuracy", label: "Accuracy" },
];
