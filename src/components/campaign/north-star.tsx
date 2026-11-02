"use client";

import { Compass } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** The agreed brief, shown on every step after the brief, so everything is judged against it. */
export function NorthStar({ campaignId, brief, agreed }: { campaignId: string; brief?: string; agreed: boolean }) {
  const pathname = usePathname();
  if (pathname.endsWith("/brief") || !brief || !agreed) return null;
  return (
    <div className="mt-3 flex items-start gap-3 rounded-[18px] bg-surface-2 px-5 py-3.5">
      <Compass className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
      <p className="line-clamp-2 flex-1 text-[13.5px] leading-relaxed text-ink-2">{brief}</p>
      <Link href={`/campaigns/${campaignId}/brief`} className="shrink-0 text-[13px] text-accent-ink hover:underline">
        Brief
      </Link>
    </div>
  );
}
