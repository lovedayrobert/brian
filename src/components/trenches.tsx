import { Coins } from "lucide-react";
import type { CoinRef, Signal } from "@/lib/domain/types";
import { compact } from "@/lib/format";
import { Card, Pill } from "./ui";

/** Coins named after a moment: the crypto crowd has already picked it up. */
export function CoinBadge({ coins }: { coins?: CoinRef[] }) {
  if (!coins?.length) return null;
  return (
    <Pill tone="accent" className="max-w-full">
      <Coins className="h-3 w-3" />
      <span className="truncate">
        Trenches on it: {coins.map((c) => `$${c.symbol}`).join(", ")}
      </span>
    </Pill>
  );
}

export function TrenchesList({ coins, limit, cultureOnly }: { coins: Signal[]; limit?: number; cultureOnly?: boolean }) {
  const culture = coins.filter((c) => c.coin && c.narrative?.kind === "culture");
  const rest = coins.filter((c) => c.coin && c.narrative?.kind !== "culture");
  const list = (cultureOnly ? culture : [...culture, ...rest]).slice(0, limit ?? coins.length);
  if (!list.length) return <Card className="px-5 py-6 text-[13px] text-ink-3">No culture coins in this sweep.</Card>;
  return (
    <Card className="divide-y divide-line">
      {list.map((s, i) => {
        const c = s.coin!;
        return (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-3.5 px-4 py-3 transition hover:bg-surface-2 ${s.narrative?.kind !== "culture" ? "opacity-50" : ""}`}
          >
            <span className="tabular w-5 shrink-0 text-right text-[12px] text-ink-3">{i + 1}</span>
            {s.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-full bg-surface-3 object-cover" />
            ) : (
              <span className="h-9 w-9 shrink-0 rounded-full bg-surface-3" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className="truncate text-[14px] font-medium">{c.name}</span>
                <span className="shrink-0 text-[12px] text-ink-3">${c.symbol}</span>
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px]">
                <KindTag kind={s.narrative?.kind} heuristic={s.narrative?.method === "heuristic"} />
                <span className="truncate text-ink-2">{s.narrative?.reference ?? s.summary ?? `${c.ageHours}h old on ${c.dex}`}</span>
              </div>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              <div className="tabular text-[13px] font-medium">${compact(c.volume1h)}</div>
              <div className="text-[11px] text-ink-3">last hour</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="tabular text-[13px] font-medium">{compact(c.buyers1h)}</div>
              <div className="text-[11px] text-ink-3">buyers/h</div>
            </div>
            <div className="hidden w-12 shrink-0 text-right text-[12px] text-ink-3 md:block">{c.ageHours}h</div>
          </a>
        );
      })}
    </Card>
  );
}

function KindTag({ kind, heuristic }: { kind?: string; heuristic?: boolean }) {
  if (kind === "culture")
    return (
      <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-[1px] text-[10.5px] font-medium text-accent-ink" title={heuristic ? "Heuristic label" : "Read by the model"}>
        Culture{heuristic ? "?" : ""}
      </span>
    );
  if (kind === "utility") return <span className="shrink-0 rounded-full bg-surface-3 px-1.5 py-[1px] text-[10.5px] text-ink-3">AI / utility</span>;
  if (kind === "generic") return <span className="shrink-0 rounded-full bg-surface-3 px-1.5 py-[1px] text-[10.5px] text-ink-3">Generic</span>;
  return null;
}
