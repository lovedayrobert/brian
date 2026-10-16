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
  ...(
    [
      ["cal_halloween_2026", "Halloween", "2026-10-31", "culture", "The biggest costume and meme day of the autumn."],
      ["cal_thanksgiving_2026", "US Thanksgiving", "2026-11-26", "culture", "US holiday; NFL triple-header and a long weekend online."],
      ["cal_black_friday_2026", "Black Friday", "2026-11-27", "culture", "Every brand shouts deals; the parody opportunity of the year."],
      ["cal_christmas_2026", "Christmas", "2026-12-25", "culture", "Peak gifting, peak family time, peak boredom online by the 26th."],
      ["cal_nye_2026", "New Year's Eve", "2026-12-31", "culture", "Countdowns, resolutions and the most predictable posts of the year."],
      ["cal_valentines_2027", "Valentine's Day", "2027-02-14", "culture", "Couples content and the anti-Valentine's crowd."],
    ] as const
  ).map(
    ([id, title, date, category, description]): Moment => ({
      id,
      kind: "calendar",
      title,
      date: `${date}T00:00:00Z`,
      category,
      description,
      sensitivity: "clear",
    }),
  ),
];
