import Link from "next/link";
import type { Trend } from "@/lib/domain/types";
import { compact } from "@/lib/format";
import { ConfidenceDots, Pill, SensitivityBadge, Sparkline, StagePill } from "./ui";

const CATEGORY_LABEL: Record<string, string> = {
  crypto: "Crypto",
  gambling: "Gambling",
  streaming: "Streaming",
  gaming: "Gaming",
  sport: "Sport",
  memes: "Memes",
  markets: "Markets",
  entertainment: "Entertainment",
  tech: "Tech",
  politics: "Politics",
  culture: "Culture",
};

export const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c;

export function TrendCard({ trend }: { trend: Trend }) {
  const values = trend.series.map((s) => s.value);
  return (
    <Link
      href={`/radar/trends/${trend.id}`}
      className="group flex flex-col rounded-[18px] bg-surface p-4 shadow-card transition hover:-translate-y-px hover:shadow-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 text-[11.5px] text-ink-3">{categoryLabel(trend.category)}</div>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight group-hover:text-accent-ink">{trend.title}</h3>
        </div>
        {trend.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trend.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-[10px] bg-surface-3 object-cover" />
        )}
      </div>

      <div className="mt-3">
        {values.length > 1 ? (
          <Sparkline values={values} />
        ) : (
          <div className="flex h-8 items-center text-[12px] text-ink-3">Rolling averages only, no daily curve</div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StagePill stage={trend.lifecycle.stage} />
        <ConfidenceDots confidence={trend.lifecycle.confidence} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-ink-2">
        <span className="tabular truncate">
          {trend.headline ? `${compact(trend.headline.value)} ${trend.headline.label.toLowerCase()}` : "—"}
        </span>
        <span className="shrink-0">{trend.signalIds.length - 1 > 0 ? `${trend.signalIds.length - 1} linked` : "Single source"}</span>
      </div>
      {trend.sensitivity !== "clear" && (
        <div className="mt-2">
          <SensitivityBadge level={trend.sensitivity} reason={trend.sensitivityReason} />
        </div>
      )}
    </Link>
  );
}

export function RelevancePill({ trend }: { trend: Trend }) {
  return (
    <Pill tone="neutral" className="tabular">
      {Math.round(trend.relevance * 100)}% relevant{trend.relevanceMethod === "heuristic" ? " (heuristic)" : ""}
    </Pill>
  );
}
