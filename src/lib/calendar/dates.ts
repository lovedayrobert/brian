/** Date helpers for the calendar, all on plain YYYY-MM-DD strings in UTC. */
export const toDay = (d: Date) => d.toISOString().slice(0, 10);
export const parseDay = (s: string) => new Date(`${s}T00:00:00Z`);
export const addDays = (s: string, n: number) => toDay(new Date(parseDay(s).getTime() + n * 86_400_000));
export const todayDay = () => {
  const n = new Date();
  return toDay(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
};
/** Monday-first weekday, 0-6. */
export const weekday = (s: string) => (parseDay(s).getUTCDay() + 6) % 7;
export const startOfWeek = (s: string) => addDays(s, -weekday(s));
export const startOfMonth = (s: string) => `${s.slice(0, 7)}-01`;
export const addMonths = (s: string, n: number) => {
  const d = parseDay(startOfMonth(s));
  d.setUTCMonth(d.getUTCMonth() + n);
  return toDay(d);
};
export const endOfMonth = (s: string) => addDays(addMonths(s, 1), -1);

export type View = "month" | "week" | "agenda" | "board";

/** The dates a view covers. */
export function rangeFor(view: View, anchor: string): { from: string; to: string } {
  if (view === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 6) };
  }
  if (view === "month") {
    const from = startOfWeek(startOfMonth(anchor));
    const last = endOfMonth(anchor);
    return { from, to: addDays(startOfWeek(last), 6) };
  }
  return { from: anchor, to: addDays(anchor, view === "agenda" ? 41 : 27) };
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthName = (s: string) => `${MONTHS[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}`;
export const shortDate = (s: string) => parseDay(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
