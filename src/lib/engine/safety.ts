import type { Sensitivity } from "@/lib/domain/types";

/**
 * Red-line pre-filter. Runs before any idea generation so the Inventor never
 * sees a tragedy as raw material. Deliberately over-inclusive: a false
 * "blocked" costs one missed idea; a false "clear" could cost the brand.
 * The model-based Red Lines agent runs afterwards as a second check.
 */
const BLOCK_PATTERNS: [RegExp, string][] = [
  [/\b(killed|dies|died|death|dead|deaths|obituary|funeral|murder(ed)?|homicide|suicide|overdose)\b/i, "Death or loss of life"],
  [/\b(shooting|gunman|stabbing|massacre|terror(ist|ism)?(?! financ)|terror attack|bomb(ing)?|hostage)\b/i, "Violence or attack"],
  [/\b(earthquake|tsunami|hurricane|typhoon|cyclone|wildfire|flood(s|ing)?|landslide|famine|disaster)\b/i, "Disaster"],
  [/\b(crash(ed)?|derail(ed|ment)?|collapse(d)?)\b.*\b(plane|flight|train|bridge|building|victims?)\b/i, "Accident with victims"],
  [/\b(war|invasion|airstrike|missile strike|genocide|refugees?)\b/i, "War or humanitarian crisis"],
  [/\b(child|children|kids?|minors?|teen(s|ager)?|school)\b/i, "May involve minors"],
  [/\b(abuse|assault|rape|trafficking)\b/i, "Abuse"],
];

const CAUTION_PATTERNS: [RegExp, string][] = [
  [/\b(attack(ed|s)?|hack(ed)?|exploit(ed)?|drained|rug ?pull|scam|stolen|insolven(t|cy)|bankrupt(cy)?)\b/i, "Financial loss to real people: react to the event, never mock victims"],
  [/\b(election|president|prime minister|senator|parliament|congress)\b/i, "Political figure: reacting to public moments is fine; no fabricated quotes or implied endorsement"],
  [/\b(arrest(ed)?|lawsuit|sued|charged|trial|court)\b/i, "Legal matter: check defamation risk"],
  [/\b(addiction|problem gambling|self[- ]exclu)\b/i, "Responsible gambling topic"],
];

export function assessSensitivity(text: string, description?: string): { level: Sensitivity; reason?: string } {
  const hay = `${text} ${description ?? ""}`;
  // A biography whose description ends with this year in a date range usually means a recent death.
  const year = new Date().getUTCFullYear();
  if (description && new RegExp(`\\(\\s*(?:born\\s+)?\\d{3,4}\\s*[–-]\\s*${year}\\s*\\)`).test(description)) {
    return { level: "blocked", reason: "Recent death (biography dates end this year)" };
  }
  for (const [re, reason] of BLOCK_PATTERNS) if (re.test(hay)) return { level: "blocked", reason };
  for (const [re, reason] of CAUTION_PATTERNS) if (re.test(hay)) return { level: "caution", reason };
  return { level: "clear" };
}
