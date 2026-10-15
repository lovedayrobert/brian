import clsx from "clsx";
import { BRANDS } from "@/lib/brand/brands";

/**
 * Key visual. Uses the generated image when there is one; otherwise a
 * code-built typographic composition from the brand tokens, so mockups are
 * always complete and on-brand. The wordmark is set in type until real logo
 * files are supplied.
 */
export function KeyVisual({
  line,
  imageUrl,
  className,
  compact,
  aspect,
  safeArea,
}: {
  line: string;
  imageUrl?: string | null;
  className?: string;
  compact?: boolean;
  aspect?: "square" | "portrait" | "landscape";
  /** Keep brand marks clear of platform chrome in full-screen formats (stories, TikTok). */
  safeArea?: boolean;
}) {
  const v = BRANDS.cashy.visual;
  const size = compact ? "text-[clamp(18px,4.2cqw,34px)]" : aspect === "portrait" ? "text-[clamp(26px,13cqw,64px)]" : "text-[clamp(22px,8cqw,72px)]";
  return (
    <div className={clsx(!className?.includes("absolute") && "relative", "isolate overflow-hidden [container-type:inline-size]", className)} style={{ background: v.primary, color: v.ink }}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      ) : (
        <>
          <div
            className="absolute -z-10"
            style={{
              inset: "-30%",
              background: `radial-gradient(40% 40% at 70% 35%, ${v.accent}55 0%, transparent 70%), radial-gradient(35% 35% at 20% 80%, ${v.accent}22 0%, transparent 70%)`,
            }}
          />
          <div
            className="absolute inset-0 -z-10 opacity-[0.07]"
            style={{
              backgroundImage: `linear-gradient(${v.ink} 1px, transparent 1px), linear-gradient(90deg, ${v.ink} 1px, transparent 1px)`,
              backgroundSize: "32px 32px",
            }}
          />
        </>
      )}
      <div className={clsx("flex h-full w-full flex-col justify-between", compact ? "p-[5cqw]" : "p-[6cqw]", safeArea && "!pb-[34cqw] !pt-[30cqw]")}>
        <div className="flex items-center gap-[1.4cqw]">
          <span className="h-[2.2cqw] max-h-3 min-h-2 w-[2.2cqw] min-w-2 max-w-3 rounded-full" style={{ background: v.accent }} />
          <span className="text-[clamp(9px,2.2cqw,15px)] font-bold uppercase tracking-[0.18em]">Cashy</span>
        </div>
        <div className={clsx("max-w-[92%] font-[750] leading-[0.95] tracking-[-0.035em]", size, imageUrl && "drop-shadow-[0_2px_24px_rgba(0,0,0,0.5)]")}>
          {line}
        </div>
        <div className="flex items-end justify-between text-[clamp(8px,1.8cqw,12px)] font-medium opacity-70">
          <span>Play responsibly</span>
          <span className="rounded-[4px] border border-current px-[0.6em] py-[0.15em]">18+</span>
        </div>
      </div>
    </div>
  );
}
