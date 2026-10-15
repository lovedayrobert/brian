import type { Moment } from "@/lib/domain/types";

/**
 * Curated culture calendar. Only dates with a public source go here, and each
 * carries a note on how sure we are. Prediction-market resolution dates are
 * added automatically by the sweep.
 */
export const CALENDAR: Moment[] = [
  {
    id: "cal_gta6",
    kind: "calendar",
    title: "GTA 6 launch",
    date: "2026-11-19T00:00:00Z",
    category: "gaming",
    description:
      "The biggest entertainment launch of the year. Rockstar's last announced date. The GTA 6 trend on the Trends screen tracks the build-up.",
    sourceUrl: "https://www.rockstargames.com/newswire",
    sensitivity: "clear",
    dateNote: "Date as last announced by Rockstar. Check the newswire before planning around it.",
  },
];
