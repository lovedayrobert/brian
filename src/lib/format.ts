export function relativeTime(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const future = diff < 0;
  const s = Math.abs(diff) / 1000;
  const fmt = (n: number, unit: string) => {
    const v = Math.round(n);
    return future ? `in ${v}${unit}` : `${v}${unit} ago`;
  };
  if (s < 60) return future ? "in moments" : "just now";
  if (s < 3600) return fmt(s / 60, "m");
  if (s < 86400) return fmt(s / 3600, "h");
  if (s < 86400 * 45) return fmt(s / 86400, "d");
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function daysUntil(iso: string, now = Date.now()): number {
  return Math.ceil((new Date(iso).getTime() - now) / 86_400_000);
}

export function compact(n: number): string {
  if (Math.abs(n) >= 1e9) return `${trim(n / 1e9)}B`;
  if (Math.abs(n) >= 1e6) return `${trim(n / 1e6)}M`;
  if (Math.abs(n) >= 1e4) return `${trim(n / 1e3)}K`;
  return Math.round(n).toLocaleString("en-GB");
}

export function usd(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && Math.abs(n) >= 10_000) return `$${compact(n)}`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function pct(r: number, digits = 1): string {
  return `${(r * 100).toFixed(r * 100 < 1 && r > 0 ? 2 : digits).replace(/\.0+$/, "")}%`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function trim(n: number) {
  return n >= 100 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, "");
}
